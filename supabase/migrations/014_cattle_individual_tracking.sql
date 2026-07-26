-- =============================================================
-- GeoCampo — Individual Cattle Tracking (TKorvex parity)
-- Migration: 014_cattle_individual_tracking.sql
--
-- 1. Extends `cattle` with category, owner, lineage, color, origen
-- 2. Creates `cattle_weights` for per-animal weighings (GMD, Frame Score BIF)
-- 3. RLS policies mirroring the existing cattle pattern
-- =============================================================

-- ─── New types ────────────────────────────────────────────────────────────────

create type cattle_category as enum (
  'vaca',       -- adult breeding female (3+ partos)
  'vaquillona', -- heifer (1-2 partos or not yet bred)
  'ternera',    -- female calf (under ~8 months)
  'toro',       -- intact breeding male
  'novillo',    -- castrated male (feedlot)
  'ternero',    -- male calf (under ~8 months)
  'torito'      -- young intact male (< 2 years)
);

create type cattle_origen as enum (
  'propio',    -- born on farm
  'comprado',  -- purchased
  'donado'     -- donated / gifted
);

-- ─── Extend cattle table ──────────────────────────────────────────────────────

alter table cattle
  add column if not exists category    cattle_category,
  add column if not exists owner_name  text,          -- inversor / propietario
  add column if not exists color       text,          -- pelaje
  add column if not exists origen      cattle_origen,
  add column if not exists padre_vid   text,          -- VID of sire (visual tag)
  add column if not exists madre_vid   text;          -- VID of dam  (visual tag)

comment on column cattle.category   is 'Zootechnical category: vaca, vaquillona, ternera, toro, novillo, ternero, torito.';
comment on column cattle.owner_name is 'Name of the investor/owner of this specific animal.';
comment on column cattle.padre_vid  is 'Visual ear-tag ID (caravana) of the sire.';
comment on column cattle.madre_vid  is 'Visual ear-tag ID (caravana) of the dam.';

-- ─── cattle_weights ───────────────────────────────────────────────────────────
-- Per-animal weighing record. Stores raw measurements; calculated fields
-- (gmd_kg_day, frame_score) are filled by the application on insert.

create table cattle_weights (
  id              uuid primary key default gen_random_uuid(),
  farm_id         uuid references farms(id) on delete cascade not null,
  cattle_id       uuid references cattle(id) on delete cascade not null,
  date            date not null,
  weight_kg       numeric(7,2) not null,
  -- Optional measurements that unlock advanced analytics
  hip_height_cm   numeric(5,1),          -- altura de cadera — triggers Frame Score BIF
  body_condition  smallint check (body_condition between 1 and 9),  -- CC 1-9
  -- Calculated at insert time by application (null if prior weight unavailable)
  gmd_kg_day      numeric(6,3),          -- Ganancia Media Diaria (kg/day)
  frame_score     numeric(4,2),          -- Frame Score BIF (1-9 scale)
  notes           text,
  created_at      timestamptz not null default now()
);

comment on table cattle_weights is 'Individual animal weighing records. gmd_kg_day and frame_score are calculated by the API on insert.';
comment on column cattle_weights.hip_height_cm is 'Hip height (cadera) in cm. When provided, Frame Score BIF is calculated automatically.';
comment on column cattle_weights.frame_score   is 'Beef Improvement Federation (BIF) Frame Score. Calculated from hip_height_cm + age.';

create index on cattle_weights (cattle_id, date desc);
create index on cattle_weights (farm_id, date desc);

-- ─── RLS for cattle_weights ───────────────────────────────────────────────────

alter table cattle_weights enable row level security;

create policy "members can view cattle weights"
  on cattle_weights for select
  using (farm_id in (select get_my_farm_ids()));

create policy "employee+ can insert cattle weights"
  on cattle_weights for insert
  with check (has_role(farm_id, 'employee'));

create policy "employee+ can update cattle weights"
  on cattle_weights for update
  using  (has_role(farm_id, 'employee'))
  with check (has_role(farm_id, 'employee'));

create policy "manager+ can delete cattle weights"
  on cattle_weights for delete
  using (has_role(farm_id, 'manager'));

-- ─── Indexes on extended cattle columns ──────────────────────────────────────

create index if not exists cattle_category_idx on cattle (farm_id, category);
create index if not exists cattle_owner_idx    on cattle (farm_id, owner_name);
