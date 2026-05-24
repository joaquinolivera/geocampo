-- GeoCampo Supabase Schema
-- Phase 0: Core database structure for offline-first livestock management
-- PostGIS extension must be enabled for geospatial operations

create extension if not exists postgis;

-- ============================================
-- FARMS (Ranches / Estancias)
-- ============================================
create table if not exists farms (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    location geometry(point, 4326), -- WGS 84 coordinate system
    total_area_hectares decimal(10, 2),
    owner_name text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

comment on table farms is 'Farms and ranches managed in the system';

-- ============================================
-- PASTURES (Paddocks / Potreros)
-- ============================================
create table if not exists pastures (
    id uuid primary key default gen_random_uuid(),
    farm_id uuid not null references farms(id) on delete cascade,
    name text not null,
    geometry geometry(polygon, 4326) not null, -- Polygon boundary in WGS 84
    area_hectares decimal(10, 2) generated always as (
        st_area(geometry::geography) / 10000
    ) stored, -- Auto-computed from geometry
    carrying_capacity integer, -- Maximum cattle count
    current_herd_id uuid, -- Currently assigned herd (nullable)
    color text, -- Display color for map rendering
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

comment on table pastures is 'Pasture fields with geospatial boundaries';

-- Spatial index for fast geospatial queries
create index if not exists idx_pastures_geometry on pastures using gist(geometry);

-- ============================================
-- HERDS (Cattle Groups / Lotes)
-- ============================================
create table if not exists herds (
    id uuid primary key default gen_random_uuid(),
    pasture_id uuid references pastures(id) on delete set null,
    farm_id uuid not null references farms(id) on delete cascade,
    name text not null,
    cattle_count integer not null default 0,
    breed text,
    entry_date date default current_date,
    exit_date date, -- null if still active
    status text not null default 'active', -- active, moved, sold, inactive
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

comment on table herds is 'Groups of cattle managed as units';

-- ============================================
-- WEIGHTS (Pesajes / Weight Records)
-- ============================================
create table if not exists weights (
    id uuid primary key default gen_random_uuid(),
    herd_id uuid not null references herds(id) on delete cascade,
    weight_kg decimal(8, 2) not null,
    cattle_count integer not null default 1, -- How many animals were weighed
    average_weight_kg decimal(8, 2) generated always as (
        case when cattle_count > 0 then weight_kg / cattle_count else null end
    ) stored,
    weighed_at timestamptz not null default now(),
    weighed_by text,
    notes text,
    created_at timestamptz default now()
);

comment on table weights is 'Weight records for cattle herds';

-- ============================================
-- HEALTH (Sanidad / Veterinary Records)
-- ============================================
create table if not exists health (
    id uuid primary key default gen_random_uuid(),
    herd_id uuid not null references herds(id) on delete cascade,
    treatment_type text not null, -- vaccination, deworming, treatment, checkup
    product_name text,
    dosage text,
    administered_by text not null,
    administered_at timestamptz not null default now(),
    next_due_date date, -- For recurring treatments like vaccines
    notes text,
    created_at timestamptz default now()
);

comment on table health is 'Health and veterinary treatment records';

-- ============================================
-- MOVEMENTS (Herd location history - for audit trail)
-- ============================================
create table if not exists movements (
    id uuid primary key default gen_random_uuid(),
    herd_id uuid not null references herds(id) on delete cascade,
    from_pasture_id uuid references pastures(id) on delete set null,
    to_pasture_id uuid not null references pastures(id),
    moved_at timestamptz not null default now(),
    moved_by text,
    verified_by_turf boolean default false, -- Was validated with geospatial check
    notes text,
    created_at timestamptz default now()
);

comment on table movements is 'Audit trail of herd movements between pastures';

-- ============================================
-- POWER-SYNC METADATA (for offline-first sync)
-- ============================================
-- PowerSync requires these tables for sync metadata

create table if not exists powersync_sync_rules (
    id serial primary key,
    table_name text not null unique,
    download_predicate text,
    upload_columns text[],
    created_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================
create index if not exists idx_pastures_farm on pastures(farm_id);
create index if not exists idx_pastures_current_herd on pastures(current_herd_id);
create index if not exists idx_herds_pasture on herds(pasture_id);
create index if not exists idx_herds_farm on herds(farm_id);
create index if not exists idx_herds_status on herds(status);
create index if not exists idx_weights_herd on weights(herd_id);
create index if not exists idx_weights_weighed_at on weights(weighed_at);
create index if not exists idx_health_herd on health(herd_id);
create index if not exists idx_health_administered_at on health(administered_at);
create index if not exists idx_movements_herd on movements(herd_id);
create index if not exists idx_movements_moved_at on movements(moved_at);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp

create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Apply to tables with updated_at
create trigger update_farms_updated_at
    before update on farms
    for each row execute function update_updated_at_column();

create trigger update_pastures_updated_at
    before update on pastures
    for each row execute function update_updated_at_column();

create trigger update_herds_updated_at
    before update on herds
    for each row execute function update_updated_at_column();

-- Update pasture current_herd_id when herd is assigned

create or replace function update_pasture_current_herd()
returns trigger as $$
begin
    -- Clear previous pasture assignment
    if old.pasture_id is not null and old.pasture_id != new.pasture_id then
        update pastures set current_herd_id = null where id = old.pasture_id;
    end if;
    
    -- Set new pasture assignment
    if new.pasture_id is not null then
        update pastures set current_herd_id = new.id where id = new.pasture_id;
    end if;
    
    return new;
end;
$$ language plpgsql;

create trigger update_pasture_on_herd_change
    after insert or update of pasture_id on herds
    for each row execute function update_pasture_current_herd();

-- Log movements automatically when herd pasture changes

create or replace function log_herd_movement()
returns trigger as $$
begin
    if old.pasture_id is distinct from new.pasture_id and new.pasture_id is not null then
        insert into movements (herd_id, from_pasture_id, to_pasture_id, moved_at)
        values (new.id, old.pasture_id, new.pasture_id, now());
    end if;
    return new;
end;
$$ language plpgsql;

create trigger log_movement_on_herd_change
    after update of pasture_id on herds
    for each row execute function log_herd_movement();

-- ============================================
-- POWER-SYNC CONFIGURATION
-- ============================================

-- Insert sync rules for PowerSync
insert into powersync_sync_rules (table_name, download_predicate) values
    ('farms', null), -- Sync all farms
    ('pastures', null), -- Sync all pastures
    ('herds', null), -- Sync all herds
    ('weights', null), -- Sync all weights
    ('health', null), -- Sync all health records
    ('movements', null) -- Sync all movements
on conflict (table_name) do nothing;
