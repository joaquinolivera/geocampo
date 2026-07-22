-- ============================================================
-- Migration 010: Expand moneda constraints + herd_id on lotes
-- ============================================================
-- 1. Expand moneda CHECK on lotes_comerciales, gastos_lote,
--    machinery, fuel_logs and machinery_maintenance to include
--    PYG (Guaraní) and BRL (Real).
--    NOTE: machinery columns may not exist yet if migration 008
--    was partially applied — we add them with IF NOT EXISTS first.
-- 2. Add herd_id FK to lotes_comerciales.
-- ============================================================

-- ── lotes_comerciales ────────────────────────────────────────

ALTER TABLE lotes_comerciales
  DROP CONSTRAINT IF EXISTS lotes_comerciales_moneda_check;

ALTER TABLE lotes_comerciales
  ADD CONSTRAINT lotes_comerciales_moneda_check
    CHECK (moneda IN ('USD', 'ARS', 'PYG', 'BRL'));

ALTER TABLE lotes_comerciales
  ADD COLUMN IF NOT EXISTS herd_id UUID REFERENCES herds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lotes_herd ON lotes_comerciales(herd_id);

-- ── gastos_lote ───────────────────────────────────────────────

ALTER TABLE gastos_lote
  DROP CONSTRAINT IF EXISTS gastos_lote_moneda_check;

ALTER TABLE gastos_lote
  ADD CONSTRAINT gastos_lote_moneda_check
    CHECK (moneda IN ('USD', 'ARS', 'PYG', 'BRL'));

-- ── machinery ────────────────────────────────────────────────
-- Ensure all columns from migration 008 exist before constraining

ALTER TABLE machinery
  ADD COLUMN IF NOT EXISTS horometro_actual  NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado            TEXT          DEFAULT 'activo',
  ADD COLUMN IF NOT EXISTS notas             TEXT,
  ADD COLUMN IF NOT EXISTS moneda            TEXT          DEFAULT 'ARS';

ALTER TABLE machinery
  DROP CONSTRAINT IF EXISTS machinery_moneda_check,
  DROP CONSTRAINT IF EXISTS machinery_estado_check;

ALTER TABLE machinery
  ADD CONSTRAINT machinery_moneda_check
    CHECK (moneda IN ('USD', 'ARS', 'PYG', 'BRL')),
  ADD CONSTRAINT machinery_estado_check
    CHECK (estado IN ('activo', 'inactivo', 'baja'));

-- ── fuel_logs ────────────────────────────────────────────────

ALTER TABLE fuel_logs
  ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'ARS';

ALTER TABLE fuel_logs
  DROP CONSTRAINT IF EXISTS fuel_logs_moneda_check;

ALTER TABLE fuel_logs
  ADD CONSTRAINT fuel_logs_moneda_check
    CHECK (moneda IN ('USD', 'ARS', 'PYG', 'BRL'));

-- ── machinery_maintenance ─────────────────────────────────────

ALTER TABLE machinery_maintenance
  ADD COLUMN IF NOT EXISTS moneda TEXT DEFAULT 'ARS';

ALTER TABLE machinery_maintenance
  DROP CONSTRAINT IF EXISTS machinery_maintenance_moneda_check;

ALTER TABLE machinery_maintenance
  ADD CONSTRAINT machinery_maintenance_moneda_check
    CHECK (moneda IN ('USD', 'ARS', 'PYG', 'BRL'));

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
