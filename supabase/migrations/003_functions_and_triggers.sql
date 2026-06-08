-- =============================================================
-- GeoCampo — Functions & Triggers
-- Migration: 003_functions_and_triggers.sql
-- =============================================================

-- =============================================================
-- SIGNUP: auto-create farm + owner membership
-- Called by: Supabase Auth hook "after signup"
-- =============================================================

create or replace function handle_new_user()
returns trigger
language plpgsql security definer
as $$
declare
  v_farm_id uuid;
  v_slug    text;
  v_name    text;
begin
  -- Derive a farm name from the email or metadata
  v_name := coalesce(
    new.raw_user_meta_data ->> 'farm_name',
    split_part(new.email, '@', 1) || '''s Farm'
  );

  -- Generate a URL-safe slug from the farm name
  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);

  -- Make slug unique if needed
  while exists (select 1 from farms where slug = v_slug) loop
    v_slug := v_slug || '-' || floor(random() * 9000 + 1000)::text;
  end loop;

  -- Create the farm
  insert into farms (slug, name, owner_id)
  values (v_slug, v_name, new.id)
  returning id into v_farm_id;

  -- Make the new user the owner
  insert into farm_members (farm_id, user_id, role)
  values (v_farm_id, new.id, 'owner');

  return new;
end;
$$;

-- Wire to auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================
-- AUDIT TRIGGER — attaches to any table that needs auditing
-- =============================================================

create or replace function audit_table_change()
returns trigger
language plpgsql security definer
as $$
declare
  v_diff jsonb;
begin
  if (tg_op = 'INSERT') then
    v_diff := to_jsonb(new);
    insert into audit_events (farm_id, table_name, row_id, action, changed_by, diff)
    values (new.farm_id, tg_table_name, new.id, 'insert', auth.uid(), v_diff);

  elsif (tg_op = 'UPDATE') then
    -- Only store changed fields
    v_diff := (
      select jsonb_object_agg(key, value)
      from jsonb_each(to_jsonb(new))
      where to_jsonb(new) -> key <> to_jsonb(old) -> key
    );
    if v_diff <> '{}' then
      insert into audit_events (farm_id, table_name, row_id, action, changed_by, diff)
      values (new.farm_id, tg_table_name, new.id, 'update', auth.uid(), v_diff);
    end if;

  elsif (tg_op = 'DELETE') then
    insert into audit_events (farm_id, table_name, row_id, action, changed_by, diff)
    values (old.farm_id, tg_table_name, old.id, 'delete', auth.uid(), to_jsonb(old));
  end if;

  return coalesce(new, old);
end;
$$;

-- Attach audit trigger to key tables
create trigger audit_pastures     after insert or update or delete on pastures     for each row execute function audit_table_change();
create trigger audit_herds        after insert or update or delete on herds        for each row execute function audit_table_change();
create trigger audit_movements    after insert              on movements    for each row execute function audit_table_change();
create trigger audit_weight_recs  after insert or update or delete on weight_records  for each row execute function audit_table_change();
create trigger audit_health_recs  after insert or update or delete on health_records  for each row execute function audit_table_change();
create trigger audit_cattle       after insert or update or delete on cattle       for each row execute function audit_table_change();
create trigger audit_expenses     after insert or update or delete on expenses     for each row execute function audit_table_change();
create trigger audit_sales        after insert              on sales        for each row execute function audit_table_change();

-- =============================================================
-- FARM STATS VIEW — pre-aggregated for dashboard
-- =============================================================

create or replace view farm_stats as
select
  f.id                                                    as farm_id,
  count(distinct p.id)                                    as pasture_count,
  coalesce(sum(p.area_hectares), 0)                       as total_area_ha,
  count(distinct h.id) filter (where h.status = 'active') as active_herd_count,
  coalesce(sum(h.cattle_count) filter (where h.status = 'active'), 0) as total_head,
  coalesce(sum(p.carrying_capacity), 0)                   as total_capacity,
  count(distinct c.id)                                    as cattle_count
from farms f
left join pastures p      on p.farm_id = f.id
left join herds h         on h.farm_id = f.id
left join cattle c        on c.farm_id = f.id and c.status = 'active'
group by f.id;

-- RLS on view (inherits from base tables — still need a policy)
-- Views with security_invoker=true respect the caller's RLS
alter view farm_stats set (security_invoker = true);

-- =============================================================
-- COST PER HEAD function — rolling ERP calculation
-- =============================================================

create or replace function cost_per_head(
  p_farm_id    uuid,
  p_from_date  date default (current_date - interval '30 days')::date,
  p_to_date    date default current_date
)
returns table (
  herd_id        uuid,
  herd_name      text,
  cattle_count   integer,
  total_cost     numeric,
  cost_per_head  numeric
)
language sql security definer stable
as $$
  select
    h.id,
    h.name,
    h.cattle_count,
    coalesce(sum(e.amount), 0)                                          as total_cost,
    case when h.cattle_count > 0
         then coalesce(sum(e.amount), 0) / h.cattle_count
         else 0 end                                                     as cost_per_head
  from herds h
  left join expenses e on e.farm_id = p_farm_id
                       and e.applied_to_herd_id = h.id
                       and e.date between p_from_date and p_to_date
  where h.farm_id = p_farm_id
    and h.status = 'active'
    and h.farm_id in (select get_my_farm_ids())
  group by h.id, h.name, h.cattle_count
$$;

-- =============================================================
-- ADG (Average Daily Gain) function per herd
-- =============================================================

create or replace function herd_adg(p_herd_id uuid)
returns numeric
language sql security definer stable
as $$
  with ordered as (
    select average_weight_kg, weighed_at,
           lag(average_weight_kg) over (order by weighed_at) as prev_kg,
           lag(weighed_at)        over (order by weighed_at) as prev_at
    from weight_records
    where herd_id = p_herd_id
    order by weighed_at desc
    limit 2
  )
  select round(
    (average_weight_kg - prev_kg) /
    nullif(extract(epoch from (weighed_at - prev_at)) / 86400, 0),
    3
  )
  from ordered
  where prev_kg is not null
  limit 1
$$;

-- ─── Phase J: pgvector similarity search ─────────────────────────────────────

create or replace function match_farm_embeddings(
  p_farm_id         uuid,
  p_query_embedding vector(1536),
  p_match_count     int  default 6,
  p_match_threshold float default 0.6
)
returns table (
  id         uuid,
  type       text,
  ref_id     uuid,
  content    text,
  metadata   jsonb,
  similarity float
)
language plpgsql security definer
as $$
begin
  return query
  select
    e.id,
    e.type,
    e.ref_id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> p_query_embedding) as similarity
  from farm_embeddings e
  where
    e.farm_id = p_farm_id
    and 1 - (e.embedding <=> p_query_embedding) > p_match_threshold
  order by e.embedding <=> p_query_embedding
  limit p_match_count;
end;
$$;

grant execute on function match_farm_embeddings to authenticated, service_role;
