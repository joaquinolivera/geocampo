-- =============================================================
-- GeoCampo — Row Level Security Policies
-- Migration: 002_rls_policies.sql
--
-- Pattern: every table is locked down to farm_id.
-- Users can only read/write rows where they are a farm_member.
-- Role escalation: write operations require manager+ or owner.
-- =============================================================

-- ─── Helper functions ─────────────────────────────────────────────────────────

-- Returns all farm_ids the current user belongs to (any role)
create or replace function get_my_farm_ids()
returns setof uuid
language sql security definer stable
as $$
  select farm_id from farm_members where user_id = auth.uid()
$$;

-- Returns the current user's role in a specific farm (null if not a member)
create or replace function get_my_role(p_farm_id uuid)
returns farm_role
language sql security definer stable
as $$
  select role from farm_members
  where user_id = auth.uid() and farm_id = p_farm_id
  limit 1
$$;

-- Returns true if current user has at least the given role in a farm
create or replace function has_role(p_farm_id uuid, p_min_role farm_role)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from farm_members
    where user_id = auth.uid()
      and farm_id = p_farm_id
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

-- =============================================================
-- farms
-- =============================================================
alter table farms enable row level security;

create policy "members can view their farms"
  on farms for select
  using (id in (select get_my_farm_ids()));

create policy "owner can update farm"
  on farms for update
  using  (id in (select get_my_farm_ids()) and has_role(id, 'owner'))
  with check (id in (select get_my_farm_ids()) and has_role(id, 'owner'));

-- Insert: handled by signup function (not direct client insert)
-- Delete: never allowed via client — contact support

-- =============================================================
-- farm_members
-- =============================================================
alter table farm_members enable row level security;

create policy "members can view their farm's members"
  on farm_members for select
  using (farm_id in (select get_my_farm_ids()));

create policy "owner/manager can invite members"
  on farm_members for insert
  with check (has_role(farm_id, 'manager'));

create policy "owner can update member roles"
  on farm_members for update
  using  (has_role(farm_id, 'owner'))
  with check (has_role(farm_id, 'owner'));

create policy "owner can remove members (not themselves)"
  on farm_members for delete
  using (has_role(farm_id, 'owner') and user_id <> auth.uid());

-- =============================================================
-- pastures
-- =============================================================
alter table pastures enable row level security;

create policy "members can view pastures"
  on pastures for select
  using (farm_id in (select get_my_farm_ids()));

create policy "manager+ can create pastures"
  on pastures for insert
  with check (has_role(farm_id, 'manager'));

create policy "manager+ can update pastures"
  on pastures for update
  using  (has_role(farm_id, 'manager'))
  with check (has_role(farm_id, 'manager'));

create policy "owner can delete pastures"
  on pastures for delete
  using (has_role(farm_id, 'owner'));

-- =============================================================
-- herds
-- =============================================================
alter table herds enable row level security;

create policy "members can view herds"
  on herds for select
  using (farm_id in (select get_my_farm_ids()));

create policy "employee+ can create herds"
  on herds for insert
  with check (has_role(farm_id, 'employee'));

create policy "employee+ can update herds"
  on herds for update
  using  (has_role(farm_id, 'employee'))
  with check (has_role(farm_id, 'employee'));

create policy "manager+ can delete herds"
  on herds for delete
  using (has_role(farm_id, 'manager'));

-- =============================================================
-- weight_records
-- =============================================================
alter table weight_records enable row level security;

create policy "members can view weight records"
  on weight_records for select
  using (farm_id in (select get_my_farm_ids()));

create policy "employee+ can insert weight records"
  on weight_records for insert
  with check (has_role(farm_id, 'employee'));

create policy "employee+ can update weight records"
  on weight_records for update
  using  (has_role(farm_id, 'employee'))
  with check (has_role(farm_id, 'employee'));

create policy "manager+ can delete weight records"
  on weight_records for delete
  using (has_role(farm_id, 'manager'));

-- =============================================================
-- health_records
-- =============================================================
alter table health_records enable row level security;

create policy "members can view health records"
  on health_records for select
  using (farm_id in (select get_my_farm_ids()));

create policy "employee+ can insert health records"
  on health_records for insert
  with check (has_role(farm_id, 'employee'));

create policy "vet+ can update health records"
  on health_records for update
  using  (has_role(farm_id, 'vet'))
  with check (has_role(farm_id, 'vet'));

create policy "manager+ can delete health records"
  on health_records for delete
  using (has_role(farm_id, 'manager'));

-- =============================================================
-- movements
-- =============================================================
alter table movements enable row level security;

create policy "members can view movements"
  on movements for select
  using (farm_id in (select get_my_farm_ids()));

create policy "employee+ can insert movements"
  on movements for insert
  with check (has_role(farm_id, 'employee'));

-- movements are immutable — no update/delete (use audit trail)

-- =============================================================
-- cattle
-- =============================================================
alter table cattle enable row level security;

create policy "members can view cattle"
  on cattle for select
  using (farm_id in (select get_my_farm_ids()));

create policy "employee+ can insert cattle"
  on cattle for insert
  with check (has_role(farm_id, 'employee'));

create policy "employee+ can update cattle"
  on cattle for update
  using  (has_role(farm_id, 'employee'))
  with check (has_role(farm_id, 'employee'));

create policy "manager+ can delete cattle"
  on cattle for delete
  using (has_role(farm_id, 'manager'));

-- =============================================================
-- ERP tables (employees, fuel_logs, expenses, machinery, sales)
-- =============================================================

-- employees
alter table employees enable row level security;
create policy "members can view employees"   on employees for select using (farm_id in (select get_my_farm_ids()));
create policy "manager+ can manage employees" on employees for all    using (has_role(farm_id, 'manager')) with check (has_role(farm_id, 'manager'));

-- fuel_logs
alter table fuel_logs enable row level security;
create policy "members can view fuel logs"    on fuel_logs for select using (farm_id in (select get_my_farm_ids()));
create policy "employee+ can insert fuel log" on fuel_logs for insert with check (has_role(farm_id, 'employee'));
create policy "manager+ can update fuel log"  on fuel_logs for update using (has_role(farm_id, 'manager')) with check (has_role(farm_id, 'manager'));
create policy "manager+ can delete fuel log"  on fuel_logs for delete using (has_role(farm_id, 'manager'));

-- expenses
alter table expenses enable row level security;
create policy "members can view expenses"    on expenses for select using (farm_id in (select get_my_farm_ids()));
create policy "employee+ can insert expense" on expenses for insert with check (has_role(farm_id, 'employee'));
create policy "manager+ can update expense"  on expenses for update using (has_role(farm_id, 'manager')) with check (has_role(farm_id, 'manager'));
create policy "manager+ can delete expense"  on expenses for delete using (has_role(farm_id, 'manager'));

-- machinery
alter table machinery enable row level security;
create policy "members can view machinery"    on machinery for select using (farm_id in (select get_my_farm_ids()));
create policy "manager+ can manage machinery" on machinery for all    using (has_role(farm_id, 'manager')) with check (has_role(farm_id, 'manager'));

-- machinery_maintenance
alter table machinery_maintenance enable row level security;
create policy "members can view maintenance"    on machinery_maintenance for select using (farm_id in (select get_my_farm_ids()));
create policy "employee+ can log maintenance"   on machinery_maintenance for insert with check (has_role(farm_id, 'employee'));
create policy "manager+ can update maintenance" on machinery_maintenance for update using (has_role(farm_id, 'manager')) with check (has_role(farm_id, 'manager'));

-- sales
alter table sales enable row level security;
create policy "members can view sales"    on sales for select using (farm_id in (select get_my_farm_ids()));
create policy "manager+ can manage sales" on sales for all    using (has_role(farm_id, 'manager')) with check (has_role(farm_id, 'manager'));

-- =============================================================
-- AI embeddings — only server-side (Edge Functions) can write
-- =============================================================
alter table farm_embeddings enable row level security;
create policy "members can query embeddings"
  on farm_embeddings for select
  using (farm_id in (select get_my_farm_ids()));
-- inserts handled by Edge Functions using service_role key (bypasses RLS)

-- =============================================================
-- audit_events — append-only, members can read their farm's log
-- =============================================================
alter table audit_events enable row level security;
create policy "members can view audit log"
  on audit_events for select
  using (farm_id in (select get_my_farm_ids()));
-- No update/delete policies — audit log is immutable
