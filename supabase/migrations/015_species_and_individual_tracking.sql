-- =============================================================
-- GeoCampo — Migration 015
-- Extend individual animal tracking to be multi-species.
--
-- Changes:
--   1. Add `species` to cattle table (default 'bovino' for all
--      existing records — backwards compatible).
--   2. Add `sheep_category` text column for ovine-specific
--      category labelling (oveja, carnero, borrego, etc.).
--   3. Index for fast per-species queries.
-- =============================================================

-- ─── 1. Species column ────────────────────────────────────────────────────────
-- References the existing herd_species enum from 001_initial_schema.sql

alter table cattle
  add column if not exists species        herd_species not null default 'bovino',
  add column if not exists sheep_category text;         -- oveja|carnero|borrego|borrega|cordero|cordera|capon

comment on column cattle.species is 'Species of this individual animal (inherits from its herd by default).';
comment on column cattle.sheep_category is 'Ovine category: oveja, carnero, borrego, borrega, cordero, cordera, capon. NULL for non-ovine animals.';

-- ─── 2. Indexes ───────────────────────────────────────────────────────────────

create index if not exists idx_cattle_farm_species
  on cattle(farm_id, species);

-- ─── 3. Updated_at trigger already exists from migration 001 ─────────────────
-- No action needed.
