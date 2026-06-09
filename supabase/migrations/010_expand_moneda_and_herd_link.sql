-- ============================================================
-- Migration 010: Expand moneda constraints + herd_id on lotes
-- ============================================================
-- 1. Expand moneda CHECK on lotes_comerciales, gastos_lote,
--    machinery, and fuel_logs to include PYG (Guaraní) and BRL (Real).
--    The frontend was updated to offer these currencies but the DB
--    still rejected them.
-- 2. Add herd_id FK to lotes_comerciales so a lote can be linked
--    to the herd it tracks.
-- ============================================================

-- ── lotes_comerciales ────────────────────────────────────────

ALTER TABLE lotes_comerciales
  DROP CONSTRAINT IF EXISTS lotes_comerciales_moneda_check;

ALTER TABLE lotes_comerciales
  ADD CONSTRAINT lotes_comerciales_moneda_check
    CHECK (moneda IN ('USD', 'ARS', 'PYG', 'BRL'));

-- Link to the herd this lote tracks (optional — a lote can be
-- a generic purchase batch without a pre-existing herd record)
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

ALTER TABLE machinery
  DROP CONSTRAINT IF EXISTS machinery_moneda_check;

ALTER TABLE machinery
  ADD CONSTRAINT machinery_moneda_check
    CHECK (moneda IN ('USD', 'ARS', 'PYG', 'BRL'));

-- ── fuel_logs ────────────────────────────────────────────────

ALTER TABLE fuel_logs
  DROP CONSTRAINT IF EXISTS fuel_logs_moneda_check;

ALTER TABLE fuel_logs
  ADD CONSTRAINT fuel_logs_moneda_check
    CHECK (moneda IN ('USD', 'ARS', 'PYG', 'BRL'));

-- ── machinery_maintenance ─────────────────────────────────────

ALTER TABLE machinery_maintenance
  DROP CONSTRAINT IF EXISTS machinery_maintenance_moneda_check;

ALTER TABLE machinery_maintenance
  ADD CONSTRAINT machinery_maintenance_moneda_check
    CHECK (moneda IN ('USD', 'ARS', 'PYG', 'BRL'));

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
