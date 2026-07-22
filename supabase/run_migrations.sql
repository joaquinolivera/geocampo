-- =============================================================
-- GeoCampo — Run ALL Migrations
-- Paste this entire file into the Supabase SQL Editor and click Run.
-- Safe to run on a fresh project. Uses IF NOT EXISTS / OR REPLACE.
-- =============================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "vector";
create extension if not exists "pg_trgm";

-- ─── Custom types ─────────────────────────────────────────────────────────────
do $$ begin
  create type farm_role         as enum ('owner', 'manager', 'vet', 'employee', 'viewer');
  exception when duplicate_object then null;
end $$;
do $$ begin
  create type herd_species      as enum ('bovino', 'ovino', 'caprino', 'equino', 'porcino', 'otro');
  exception when duplicate_object then null;
end $$;
do $$ begin
  create type herd_status       as enum ('active', 'moved', 'sold', 'inactive');
  exception when duplicate_object then null;
end $$;
do $$ begin
  create type grass_type        as enum ('natural','mejorado','ryegrass','festuca','alfalfa','brachiaria','sorgo','maiz','otro');
  exception when duplicate_object then null;
end $$;
do $$ begin
  create type water_supply_type as enum ('tajamar','molino','bebedero','arroyo','pozo','none');
  exception when duplicate_object then null;
end $$;
do $$ begin
  create type treatment_type    as enum ('vaccination','deworming','checkup','surgery','medication','other');
  exception when duplicate_object then null;
end $$;
do $$ begin
  create type cattle_sex        as enum ('male','female','castrated');
  exception when duplicate_object then null;
end $$;
do $$ begin
  create type cattle_status     as enum ('active','sold','deceased','transferred');
  exception when duplicate_object then null;
end $$;
do $$ begin
  create type expense_category  as enum ('veterinary','feed','fuel','labor','infrastructure','machinery','transport','taxes','other');
  exception when duplicate_object then null;
end $$;
do $$ begin
  create type machinery_status  as enum ('active','maintenance','retired');
  exception when duplicate_object then null;
end $$;
do $$ begin
  create type audit_action      as enum ('insert','update','delete');
  exception when duplicate_object then null;
end $$;

-- =============================================================
-- CORE TABLES
-- =============================================================

create table if not exists farms (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text unique not null,
  name                 text not null,
  owner_id             uuid references auth.users(id) on delete restrict not null,
  location_lng         double precision,
  location_lat         double precision,
  total_area_hectares  numeric(10,2),
  country              text not null default 'PY',
  subscription_tier    text not null default 'free',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists farm_members (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid references farms(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  role        farm_role not null default 'viewer',
  invited_by  uuid references auth.users(id) on delete set null,
  joined_at   timestamptz not null default now(),
  unique (farm_id, user_id)
);

create table if not exists pastures (
  id                uuid primary key default gen_random_uuid(),
  farm_id           uuid references farms(id) on delete cascade not null,
  name              text not null,
  coordinates       jsonb not null,
  area_hectares     numeric(10,2),
  carrying_capacity integer,
  grass_type        grass_type,
  water_supply      water_supply_type,
  elevation_m       numeric(7,1),
  color             text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists herds (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid references farms(id) on delete cascade not null,
  pasture_id   uuid references pastures(id) on delete set null,
  name         text not null,
  species      herd_species not null default 'bovino',
  breed        text,
  cattle_count integer not null default 0,
  status       herd_status not null default 'active',
  entry_date   date,
  coord_lng    double precision,
  coord_lat    double precision,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Phase G: individual cattle BEFORE weight/health so FKs work
create table if not exists cattle (
  id             uuid primary key default gen_random_uuid(),
  farm_id        uuid references farms(id) on delete cascade not null,
  herd_id        uuid references herds(id) on delete set null,
  chip_id        text,
  visual_tag_id  text,
  sex            cattle_sex,
  breed          text,
  dob            date,
  status         cattle_status not null default 'active',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (farm_id, chip_id)
);
comment on column cattle.chip_id is 'DIOB: ISO 11784/11785 FDX-B microchip EID (left ear).';

create table if not exists weight_records (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid references farms(id) on delete cascade not null,
  herd_id             uuid references herds(id) on delete cascade not null,
  cattle_id           uuid references cattle(id) on delete set null,
  cattle_count        integer not null,
  average_weight_kg   numeric(7,2) not null,
  weighed_at          timestamptz not null,
  weighed_by          text,
  notes               text,
  created_at          timestamptz not null default now()
);

create table if not exists health_records (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid references farms(id) on delete cascade not null,
  herd_id          uuid references herds(id) on delete cascade not null,
  cattle_id        uuid references cattle(id) on delete set null,
  treatment_type   treatment_type not null,
  product_name     text,
  dosage           text,
  administered_at  timestamptz not null,
  administered_by  text,
  next_due_date    date,
  notes            text,
  created_at       timestamptz not null default now()
);

create table if not exists movements (
  id                uuid primary key default gen_random_uuid(),
  farm_id           uuid references farms(id) on delete cascade not null,
  herd_id           uuid references herds(id) on delete cascade not null,
  herd_name         text not null,
  from_pasture_id   uuid references pastures(id) on delete set null,
  from_pasture_name text,
  to_pasture_id     uuid references pastures(id) on delete set null,
  to_pasture_name   text not null,
  moved_at          timestamptz not null,
  moved_by          text,
  notes             text,
  created_at        timestamptz not null default now()
);

-- =============================================================
-- ERP TABLES
-- =============================================================

create table if not exists employees (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid references farms(id) on delete cascade not null,
  name             text not null,
  role             text,
  id_number        text,
  hire_date        date,
  salary_monthly   numeric(12,2),
  phone            text,
  active           boolean not null default true,
  notes            text,
  created_at       timestamptz not null default now()
);

create table if not exists fuel_logs (
  id                uuid primary key default gen_random_uuid(),
  farm_id           uuid references farms(id) on delete cascade not null,
  date              date not null,
  liters            numeric(10,2) not null,
  cost_per_liter    numeric(10,4),
  total_cost        numeric(12,2),
  vehicle_equipment text,
  purpose           text,
  odometer_km       numeric(10,1),
  notes             text,
  created_at        timestamptz not null default now()
);

create table if not exists expenses (
  id                    uuid primary key default gen_random_uuid(),
  farm_id               uuid references farms(id) on delete cascade not null,
  date                  date not null,
  category              expense_category not null,
  description           text not null,
  amount                numeric(14,2) not null,
  supplier              text,
  applied_to_herd_id    uuid references herds(id) on delete set null,
  applied_to_pasture_id uuid references pastures(id) on delete set null,
  applied_to_cattle_id  uuid references cattle(id) on delete set null,
  receipt_url           text,
  notes                 text,
  created_at            timestamptz not null default now()
);

create table if not exists machinery (
  id             uuid primary key default gen_random_uuid(),
  farm_id        uuid references farms(id) on delete cascade not null,
  name           text not null,
  type           text,
  brand          text,
  model          text,
  year           integer,
  purchase_date  date,
  purchase_price numeric(14,2),
  status         machinery_status not null default 'active',
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists machinery_maintenance (
  id                uuid primary key default gen_random_uuid(),
  farm_id           uuid references farms(id) on delete cascade not null,
  machinery_id      uuid references machinery(id) on delete cascade not null,
  date              date not null,
  description       text not null,
  cost              numeric(12,2),
  performed_by      text,
  next_service_date date,
  notes             text,
  created_at        timestamptz not null default now()
);

create table if not exists sales (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid references farms(id) on delete cascade not null,
  date             date not null,
  herd_id          uuid references herds(id) on delete set null,
  cattle_count     integer,
  total_weight_kg  numeric(10,2),
  price_per_kg     numeric(10,4),
  total_amount     numeric(14,2),
  buyer            text,
  movement_id      uuid references movements(id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now()
);

-- =============================================================
-- AI / RAG
-- =============================================================

create table if not exists farm_embeddings (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid references farms(id) on delete cascade not null,
  source_table text not null,
  source_id    uuid not null,
  content      text not null,
  embedding    vector(1536),
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

-- =============================================================
-- AUDIT LOG
-- =============================================================

create table if not exists audit_events (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null,
  table_name   text not null,
  row_id       uuid,
  action       audit_action not null,
  changed_by   uuid references auth.users(id) on delete set null,
  changed_at   timestamptz not null default now(),
  diff         jsonb
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists idx_pastures_farm        on pastures (farm_id);
create index if not exists idx_herds_farm           on herds (farm_id);
create index if not exists idx_herds_pasture        on herds (pasture_id);
create index if not exists idx_weight_farm_herd     on weight_records (farm_id, herd_id);
create index if not exists idx_weight_at            on weight_records (weighed_at desc);
create index if not exists idx_health_farm_herd     on health_records (farm_id, herd_id);
create index if not exists idx_health_due           on health_records (next_due_date);
create index if not exists idx_movements_farm       on movements (farm_id);
create index if not exists idx_movements_herd       on movements (herd_id);
create index if not exists idx_cattle_farm          on cattle (farm_id);
create index if not exists idx_cattle_herd          on cattle (herd_id);
create index if not exists idx_expenses_farm_date   on expenses (farm_id, date desc);
create index if not exists idx_fuel_farm_date       on fuel_logs (farm_id, date desc);
create index if not exists idx_audit_farm_date      on audit_events (farm_id, changed_at desc);
create index if not exists idx_embeddings_farm      on farm_embeddings (farm_id, source_table);
create index if not exists idx_embeddings_vector    on farm_embeddings using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace trigger set_farms_updated_at    before update on farms    for each row execute function set_updated_at();
create or replace trigger set_pastures_updated_at before update on pastures for each row execute function set_updated_at();
create or replace trigger set_herds_updated_at    before update on herds    for each row execute function set_updated_at();
create or replace trigger set_cattle_updated_at   before update on cattle   for each row execute function set_updated_at();

-- =============================================================
-- ROW LEVEL SECURITY
-- =============================================================

create or replace function get_my_farm_ids()
returns setof uuid language sql security definer stable as $$
  select farm_id from farm_members where user_id = auth.uid()
$$;

create or replace function get_my_role(p_farm_id uuid)
returns farm_role language sql security definer stable as $$
  select role from farm_members
  where user_id = auth.uid() and farm_id = p_farm_id limit 1
$$;

create or replace function has_role(p_farm_id uuid, p_min_role farm_role)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from farm_members
    where user_id = auth.uid() and farm_id = p_farm_id
      and role = any(
        case p_min_role
          when 'viewer'   then array['viewer','employee','vet','manager','owner']::farm_role[]
          when 'employee' then array['employee','vet','manager','owner']::farm_role[]
          when 'vet'      then array['vet','manager','owner']::farm_role[]
          when 'manager'  then array['manager','owner']::farm_role[]
          when 'owner'    then array['owner']::farm_role[]
        end
      )
  )
$$;

-- Enable RLS
alter table farms              enable row level security;
alter table farm_members       enable row level security;
alter table pastures           enable row level security;
alter table herds              enable row level security;
alter table weight_records     enable row level security;
alter table health_records     enable row level security;
alter table movements          enable row level security;
alter table cattle             enable row level security;
alter table employees          enable row level security;
alter table fuel_logs          enable row level security;
alter table expenses           enable row level security;
alter table machinery          enable row level security;
alter table machinery_maintenance enable row level security;
alter table sales              enable row level security;
alter table farm_embeddings    enable row level security;
alter table audit_events       enable row level security;

-- farms
create policy "members can view their farms"   on farms for select using (id in (select get_my_farm_ids()));
create policy "owner can update farm"          on farms for update using  (id in (select get_my_farm_ids()) and has_role(id,'owner')) with check (id in (select get_my_farm_ids()) and has_role(id,'owner'));

-- farm_members
create policy "members can view farm members"  on farm_members for select using (farm_id in (select get_my_farm_ids()));
create policy "manager+ can invite"            on farm_members for insert with check (has_role(farm_id,'manager'));
create policy "owner can update roles"         on farm_members for update using  (has_role(farm_id,'owner')) with check (has_role(farm_id,'owner'));
create policy "owner can remove members"       on farm_members for delete using  (has_role(farm_id,'owner') and user_id <> auth.uid());

-- pastures
create policy "members can view pastures"      on pastures for select using (farm_id in (select get_my_farm_ids()));
create policy "manager+ can create pastures"   on pastures for insert with check (has_role(farm_id,'manager'));
create policy "manager+ can update pastures"   on pastures for update using  (has_role(farm_id,'manager')) with check (has_role(farm_id,'manager'));
create policy "owner can delete pastures"      on pastures for delete using  (has_role(farm_id,'owner'));

-- herds
create policy "members can view herds"         on herds for select using (farm_id in (select get_my_farm_ids()));
create policy "employee+ can create herds"     on herds for insert with check (has_role(farm_id,'employee'));
create policy "employee+ can update herds"     on herds for update using  (has_role(farm_id,'employee')) with check (has_role(farm_id,'employee'));
create policy "manager+ can delete herds"      on herds for delete using  (has_role(farm_id,'manager'));

-- weight_records
create policy "members can view weight"        on weight_records for select using (farm_id in (select get_my_farm_ids()));
create policy "employee+ can insert weight"    on weight_records for insert with check (has_role(farm_id,'employee'));
create policy "employee+ can update weight"    on weight_records for update using  (has_role(farm_id,'employee')) with check (has_role(farm_id,'employee'));
create policy "manager+ can delete weight"     on weight_records for delete using  (has_role(farm_id,'manager'));

-- health_records
create policy "members can view health"        on health_records for select using (farm_id in (select get_my_farm_ids()));
create policy "employee+ can insert health"    on health_records for insert with check (has_role(farm_id,'employee'));
create policy "vet+ can update health"         on health_records for update using  (has_role(farm_id,'vet')) with check (has_role(farm_id,'vet'));
create policy "manager+ can delete health"     on health_records for delete using  (has_role(farm_id,'manager'));

-- movements (immutable)
create policy "members can view movements"     on movements for select using (farm_id in (select get_my_farm_ids()));
create policy "employee+ can insert movements" on movements for insert with check (has_role(farm_id,'employee'));

-- cattle
create policy "members can view cattle"        on cattle for select using (farm_id in (select get_my_farm_ids()));
create policy "employee+ can insert cattle"    on cattle for insert with check (has_role(farm_id,'employee'));
create policy "employee+ can update cattle"    on cattle for update using  (has_role(farm_id,'employee')) with check (has_role(farm_id,'employee'));
create policy "manager+ can delete cattle"     on cattle for delete using  (has_role(farm_id,'manager'));

-- ERP
create policy "members can view employees"     on employees for select using (farm_id in (select get_my_farm_ids()));
create policy "manager+ can manage employees"  on employees for all    using (has_role(farm_id,'manager')) with check (has_role(farm_id,'manager'));
create policy "members can view fuel"          on fuel_logs for select using (farm_id in (select get_my_farm_ids()));
create policy "employee+ can log fuel"         on fuel_logs for insert with check (has_role(farm_id,'employee'));
create policy "manager+ can update fuel"       on fuel_logs for update using  (has_role(farm_id,'manager')) with check (has_role(farm_id,'manager'));
create policy "manager+ can delete fuel"       on fuel_logs for delete using  (has_role(farm_id,'manager'));
create policy "members can view expenses"      on expenses for select using (farm_id in (select get_my_farm_ids()));
create policy "employee+ can log expense"      on expenses for insert with check (has_role(farm_id,'employee'));
create policy "manager+ can update expense"    on expenses for update using  (has_role(farm_id,'manager')) with check (has_role(farm_id,'manager'));
create policy "manager+ can delete expense"    on expenses for delete using  (has_role(farm_id,'manager'));
create policy "members can view machinery"     on machinery for select using (farm_id in (select get_my_farm_ids()));
create policy "manager+ can manage machinery"  on machinery for all    using (has_role(farm_id,'manager')) with check (has_role(farm_id,'manager'));
create policy "members can view maintenance"   on machinery_maintenance for select using (farm_id in (select get_my_farm_ids()));
create policy "employee+ can log maintenance"  on machinery_maintenance for insert with check (has_role(farm_id,'employee'));
create policy "manager+ can update maintenance" on machinery_maintenance for update using (has_role(farm_id,'manager')) with check (has_role(farm_id,'manager'));
create policy "members can view sales"         on sales for select using (farm_id in (select get_my_farm_ids()));
create policy "manager+ can manage sales"      on sales for all    using (has_role(farm_id,'manager')) with check (has_role(farm_id,'manager'));

-- AI / embeddings (writes via service_role only)
create policy "members can query embeddings"   on farm_embeddings for select using (farm_id in (select get_my_farm_ids()));

-- audit log (read-only for members)
create policy "members can view audit log"     on audit_events for select using (farm_id in (select get_my_farm_ids()));

-- =============================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================

-- Auto-create farm + owner on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_farm_id uuid;
  v_slug    text;
  v_name    text;
begin
  v_name := coalesce(
    new.raw_user_meta_data ->> 'farm_name',
    split_part(new.email, '@', 1) || '''s Farm'
  );
  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  while exists (select 1 from farms where slug = v_slug) loop
    v_slug := v_slug || '-' || floor(random() * 9000 + 1000)::text;
  end loop;
  insert into farms (slug, name, owner_id) values (v_slug, v_name, new.id) returning id into v_farm_id;
  insert into farm_members (farm_id, user_id, role) values (v_farm_id, new.id, 'owner');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Audit trigger
create or replace function audit_table_change()
returns trigger language plpgsql security definer as $$
declare v_diff jsonb;
begin
  if (tg_op = 'INSERT') then
    v_diff := to_jsonb(new);
    insert into audit_events (farm_id, table_name, row_id, action, changed_by, diff)
    values (new.farm_id, tg_table_name, new.id, 'insert', auth.uid(), v_diff);
  elsif (tg_op = 'UPDATE') then
    v_diff := (select jsonb_object_agg(key, value) from jsonb_each(to_jsonb(new)) where to_jsonb(new)->key <> to_jsonb(old)->key);
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

create or replace trigger audit_pastures     after insert or update or delete on pastures         for each row execute function audit_table_change();
create or replace trigger audit_herds        after insert or update or delete on herds            for each row execute function audit_table_change();
create or replace trigger audit_movements    after insert                     on movements        for each row execute function audit_table_change();
create or replace trigger audit_weight_recs  after insert or update or delete on weight_records   for each row execute function audit_table_change();
create or replace trigger audit_health_recs  after insert or update or delete on health_records   for each row execute function audit_table_change();
create or replace trigger audit_cattle       after insert or update or delete on cattle           for each row execute function audit_table_change();
create or replace trigger audit_expenses     after insert or update or delete on expenses         for each row execute function audit_table_change();
create or replace trigger audit_sales        after insert                     on sales            for each row execute function audit_table_change();

-- Farm stats view
create or replace view farm_stats as
select
  f.id                                                    as farm_id,
  count(distinct p.id)                                    as pasture_count,
  coalesce(sum(p.area_hectares), 0)                       as total_area_ha,
  count(distinct h.id) filter (where h.status = 'active') as active_herd_count,
  coalesce(sum(h.cattle_count) filter (where h.status = 'active'), 0) as total_head,
  coalesce(sum(p.carrying_capacity), 0)                   as total_capacity,
  count(distinct c.id) filter (where c.status = 'active') as individual_cattle_count
from farms f
left join pastures p on p.farm_id = f.id
left join herds h    on h.farm_id = f.id
left join cattle c   on c.farm_id = f.id
group by f.id;

alter view farm_stats set (security_invoker = true);

-- Cost per head
create or replace function cost_per_head(
  p_farm_id   uuid,
  p_from_date date default (current_date - interval '30 days')::date,
  p_to_date   date default current_date
)
returns table (herd_id uuid, herd_name text, cattle_count integer, total_cost numeric, cost_per_head numeric)
language sql security definer stable as $$
  select h.id, h.name, h.cattle_count,
    coalesce(sum(e.amount), 0) as total_cost,
    case when h.cattle_count > 0 then coalesce(sum(e.amount), 0) / h.cattle_count else 0 end
  from herds h
  left join expenses e on e.farm_id = p_farm_id and e.applied_to_herd_id = h.id and e.date between p_from_date and p_to_date
  where h.farm_id = p_farm_id and h.status = 'active' and h.farm_id in (select get_my_farm_ids())
  group by h.id, h.name, h.cattle_count
$$;

-- Herd ADG
create or replace function herd_adg(p_herd_id uuid)
returns numeric language sql security definer stable as $$
  with ordered as (
    select average_weight_kg, weighed_at,
           lag(average_weight_kg) over (order by weighed_at) as prev_kg,
           lag(weighed_at)        over (order by weighed_at) as prev_at
    from weight_records where herd_id = p_herd_id
    order by weighed_at desc limit 2
  )
  select round(
    (average_weight_kg - prev_kg) / nullif(extract(epoch from (weighed_at - prev_at)) / 86400, 0), 3
  ) from ordered where prev_kg is not null limit 1
$$;

-- pgvector similarity search (Phase J)
create or replace function match_farm_embeddings(
  p_farm_id         uuid,
  p_query_embedding vector(1536),
  p_match_count     int   default 6,
  p_match_threshold float default 0.6
)
returns table (id uuid, source_table text, source_id uuid, content text, metadata jsonb, similarity float)
language plpgsql security definer as $$
begin
  return query
  select
    e.id,
    e.source_table,
    e.source_id,
    e.content,
    e.metadata,
    1 - (e.embedding <=> p_query_embedding) as similarity
  from farm_embeddings e
  where e.farm_id = p_farm_id
    and 1 - (e.embedding <=> p_query_embedding) > p_match_threshold
  order by e.embedding <=> p_query_embedding
  limit p_match_count;
end;
$$;

grant execute on function match_farm_embeddings to authenticated, service_role;
grant execute on function cost_per_head         to authenticated, service_role;
grant execute on function herd_adg              to authenticated, service_role;
grant execute on function get_my_farm_ids       to authenticated, service_role;
grant execute on function get_my_role           to authenticated, service_role;
grant execute on function has_role              to authenticated, service_role;
