-- =============================================================
-- GeoCampo — Initial Schema
-- Migration: 001_initial_schema.sql
--
-- Multi-tenant SaaS: every table carries farm_id.
-- RLS policies ensure users only see their own farm's data.
-- =============================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "vector";          -- pgvector for Phase J (RAG)
create extension if not exists "pg_trgm";         -- fuzzy search

-- ─── Custom types ─────────────────────────────────────────────────────────────

create type farm_role         as enum ('owner', 'manager', 'vet', 'employee', 'viewer');
create type herd_species      as enum ('bovino', 'ovino', 'caprino', 'equino', 'porcino', 'otro');
create type herd_status       as enum ('active', 'moved', 'sold', 'inactive');
create type grass_type        as enum ('natural','mejorado','ryegrass','festuca','alfalfa','brachiaria','sorgo','maiz','otro');
create type water_supply_type as enum ('tajamar','molino','bebedero','arroyo','pozo','none');
create type treatment_type    as enum ('vaccination','deworming','checkup','surgery','medication','other');
create type cattle_sex        as enum ('male','female','castrated');
create type cattle_status     as enum ('active','sold','deceased','transferred');
create type expense_category  as enum ('veterinary','feed','fuel','labor','infrastructure','machinery','transport','taxes','other');
create type machinery_status  as enum ('active','maintenance','retired');
create type audit_action      as enum ('insert','update','delete');

-- =============================================================
-- CORE TABLES
-- =============================================================

-- ─── farms ────────────────────────────────────────────────────────────────────
create table farms (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text unique not null,
  name                 text not null,
  owner_id             uuid references auth.users(id) on delete restrict not null,
  location_lng         double precision,
  location_lat         double precision,
  total_area_hectares  numeric(10,2),
  country              text not null default 'PY',
  subscription_tier    text not null default 'free',   -- free | pro | enterprise
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on table farms is 'One row per customer establishment (tenant root).';

-- ─── farm_members ─────────────────────────────────────────────────────────────
create table farm_members (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid references farms(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  role        farm_role not null default 'viewer',
  invited_by  uuid references auth.users(id) on delete set null,
  joined_at   timestamptz not null default now(),
  unique (farm_id, user_id)
);
comment on table farm_members is 'Who belongs to which farm and with what role.';

-- ─── pastures ─────────────────────────────────────────────────────────────────
create table pastures (
  id                uuid primary key default gen_random_uuid(),
  farm_id           uuid references farms(id) on delete cascade not null,
  name              text not null,
  coordinates       jsonb not null,              -- [[[lng,lat],...]] — GeoJSON polygon rings
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

-- ─── herds ────────────────────────────────────────────────────────────────────
create table herds (
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

-- ─── weight_records ───────────────────────────────────────────────────────────
create table weight_records (
  id                  uuid primary key default gen_random_uuid(),
  farm_id             uuid references farms(id) on delete cascade not null,
  herd_id             uuid references herds(id) on delete cascade not null,
  cattle_count        integer not null,
  average_weight_kg   numeric(7,2) not null,
  weighed_at          timestamptz not null,
  weighed_by          text,
  notes               text,
  created_at          timestamptz not null default now()
);

-- ─── health_records ───────────────────────────────────────────────────────────
create table health_records (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid references farms(id) on delete cascade not null,
  herd_id          uuid references herds(id) on delete cascade not null,
  treatment_type   treatment_type not null,
  product_name     text,
  dosage           text,
  administered_at  timestamptz not null,
  administered_by  text,
  next_due_date    date,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ─── movements ────────────────────────────────────────────────────────────────
create table movements (
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
-- PHASE G — Individual cattle (DIOB / SENACSA)
-- =============================================================

create table cattle (
  id             uuid primary key default gen_random_uuid(),
  farm_id        uuid references farms(id) on delete cascade not null,
  herd_id        uuid references herds(id) on delete set null,
  chip_id        text,           -- ISO 11784/11785 FDX-B EID (15 digits)
  visual_tag_id  text,           -- printed tag number (right ear)
  sex            cattle_sex,
  breed          text,
  dob            date,
  status         cattle_status not null default 'active',
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (farm_id, chip_id)
);
comment on column cattle.chip_id is 'DIOB: ISO 11784/11785 FDX-B microchip ID (left ear).';

-- Weight and health records can optionally reference an individual animal
alter table weight_records  add column cattle_id uuid references cattle(id) on delete set null;
alter table health_records  add column cattle_id uuid references cattle(id) on delete set null;

-- =============================================================
-- PHASE I — ERP tables
-- =============================================================

-- ─── employees ────────────────────────────────────────────────────────────────
create table employees (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid references farms(id) on delete cascade not null,
  name             text not null,
  role             text,
  id_number        text,          -- CUIL (AR) / cédula (PY)
  hire_date        date,
  salary_monthly   numeric(12,2),
  phone            text,
  active           boolean not null default true,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ─── fuel_logs ────────────────────────────────────────────────────────────────
create table fuel_logs (
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

-- ─── expenses ─────────────────────────────────────────────────────────────────
create table expenses (
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
  receipt_url           text,       -- Supabase Storage path
  notes                 text,
  created_at            timestamptz not null default now()
);

-- ─── machinery ────────────────────────────────────────────────────────────────
create table machinery (
  id             uuid primary key default gen_random_uuid(),
  farm_id        uuid references farms(id) on delete cascade not null,
  name           text not null,
  type           text,            -- tractor | plow | pump | horse | ATV | ...
  brand          text,
  model          text,
  year           integer,
  purchase_date  date,
  purchase_price numeric(14,2),
  status         machinery_status not null default 'active',
  notes          text,
  created_at     timestamptz not null default now()
);

create table machinery_maintenance (
  id               uuid primary key default gen_random_uuid(),
  farm_id          uuid references farms(id) on delete cascade not null,
  machinery_id     uuid references machinery(id) on delete cascade not null,
  date             date not null,
  description      text not null,
  cost             numeric(12,2),
  performed_by     text,
  next_service_date date,
  notes            text,
  created_at       timestamptz not null default now()
);

-- ─── sales (income) ───────────────────────────────────────────────────────────
create table sales (
  id             uuid primary key default gen_random_uuid(),
  farm_id        uuid references farms(id) on delete cascade not null,
  date           date not null,
  herd_id        uuid references herds(id) on delete set null,
  cattle_count   integer,
  total_weight_kg numeric(10,2),
  price_per_kg   numeric(10,4),
  total_amount   numeric(14,2),
  buyer          text,
  movement_id    uuid references movements(id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now()
);

-- =============================================================
-- PHASE J — AI / RAG embeddings
-- =============================================================

create table farm_embeddings (
  id          uuid primary key default gen_random_uuid(),
  farm_id     uuid references farms(id) on delete cascade not null,
  source_table text not null,     -- 'weight_records' | 'health_records' | ...
  source_id   uuid not null,
  content     text not null,      -- human-readable text that was embedded
  embedding   vector(1536),       -- OpenAI / Anthropic embedding dimension
  created_at  timestamptz not null default now()
);
create index on farm_embeddings using ivfflat (embedding vector_cosine_ops);

-- =============================================================
-- AUDIT LOG
-- =============================================================

create table audit_events (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null,     -- no FK — keep even if farm is deleted
  table_name   text not null,
  row_id       uuid,
  action       audit_action not null,
  changed_by   uuid references auth.users(id) on delete set null,
  changed_at   timestamptz not null default now(),
  diff         jsonb
);
comment on table audit_events is 'Immutable audit trail. Never update or delete rows.';

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index on pastures          (farm_id);
create index on herds             (farm_id);
create index on herds             (pasture_id);
create index on weight_records    (farm_id, herd_id);
create index on weight_records    (weighed_at desc);
create index on health_records    (farm_id, herd_id);
create index on health_records    (next_due_date);
create index on movements         (farm_id);
create index on movements         (herd_id);
create index on cattle            (farm_id);
create index on cattle            (herd_id);
create index on expenses          (farm_id, date desc);
create index on fuel_logs         (farm_id, date desc);
create index on audit_events      (farm_id, changed_at desc);
create index on farm_embeddings   (farm_id, source_table);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_farms_updated_at    before update on farms    for each row execute function set_updated_at();
create trigger set_pastures_updated_at before update on pastures for each row execute function set_updated_at();
create trigger set_herds_updated_at    before update on herds    for each row execute function set_updated_at();
create trigger set_cattle_updated_at   before update on cattle   for each row execute function set_updated_at();
