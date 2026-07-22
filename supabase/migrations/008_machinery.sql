-- ============================================================
-- Migration 008: Machinery & Fleet — extend existing tables
-- ============================================================
-- Migration 001 already created:
--   machinery (id, farm_id, name, type, brand, model, year,
--              purchase_date, purchase_price, status, notes)
--   machinery_maintenance (id, farm_id, machinery_id, date,
--                          description, cost, performed_by,
--                          next_service_date, notes)
--
-- This migration:
--   1. Adds missing columns to both tables
--   2. Creates fuel_logs (new)
--   3. Adds RLS policies
--   4. Creates depreciation view
-- ============================================================

-- ── 1. Extend machinery ───────────────────────────────────────

ALTER TABLE machinery
  ADD COLUMN IF NOT EXISTS numero_serie    TEXT,
  ADD COLUMN IF NOT EXISTS patente         TEXT,
  ADD COLUMN IF NOT EXISTS horometro_inicial  NUMERIC(10,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS horometro_actual   NUMERIC(10,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS odometro_km        NUMERIC(10,0) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vida_util_años     SMALLINT DEFAULT 10,
  ADD COLUMN IF NOT EXISTS updated_at         TIMESTAMPTZ DEFAULT NOW();

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_machinery_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER machinery_updated_at
  BEFORE UPDATE ON machinery
  FOR EACH ROW EXECUTE FUNCTION update_machinery_updated_at();

-- ── 2. Extend machinery_maintenance ──────────────────────────

ALTER TABLE machinery_maintenance
  ADD COLUMN IF NOT EXISTS tipo          TEXT DEFAULT 'preventivo'
                                         CHECK (tipo IN ('preventivo','correctivo','inspeccion','otro')),
  ADD COLUMN IF NOT EXISTS moneda        TEXT DEFAULT 'ARS' CHECK (moneda IN ('USD','ARS')),
  ADD COLUMN IF NOT EXISTS proveedor     TEXT,
  ADD COLUMN IF NOT EXISTS completado    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS registrado_por UUID REFERENCES auth.users(id);

-- ── 3. fuel_logs (new) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS fuel_logs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  machinery_id    UUID        REFERENCES machinery(id) ON DELETE CASCADE NOT NULL,
  farm_id         UUID        REFERENCES farms(id) ON DELETE CASCADE NOT NULL,
  fecha           DATE        NOT NULL DEFAULT CURRENT_DATE,
  litros          NUMERIC(8,2) NOT NULL CHECK (litros > 0),
  costo_por_litro NUMERIC(8,4),
  costo_total     NUMERIC(12,2),
  moneda          TEXT        NOT NULL DEFAULT 'ARS' CHECK (moneda IN ('USD','ARS')),
  horometro       NUMERIC(10,1),
  odometro_km     NUMERIC(10,0),
  notas           TEXT,
  registrado_por  UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fuel_machinery ON fuel_logs(machinery_id);
CREATE INDEX IF NOT EXISTS idx_fuel_farm      ON fuel_logs(farm_id);

-- ── 4. RLS ───────────────────────────────────────────────────

ALTER TABLE machinery             ENABLE ROW LEVEL SECURITY;
ALTER TABLE machinery_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_logs             ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE tablename IN ('machinery','machinery_maintenance','fuel_logs') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname,
      (SELECT tablename FROM pg_policies WHERE policyname = r.policyname LIMIT 1));
  END LOOP;
END$$;

-- machinery policies
CREATE POLICY "machinery_select" ON machinery FOR SELECT USING (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL)
);
CREATE POLICY "machinery_insert" ON machinery FOR INSERT WITH CHECK (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND role IN ('owner','capataz','manager') AND accepted_at IS NOT NULL)
);
CREATE POLICY "machinery_update" ON machinery FOR UPDATE USING (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND role IN ('owner','capataz','manager') AND accepted_at IS NOT NULL)
);
CREATE POLICY "machinery_delete" ON machinery FOR DELETE USING (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND role = 'owner' AND accepted_at IS NOT NULL)
);

-- machinery_maintenance policies
CREATE POLICY "maint_select" ON machinery_maintenance FOR SELECT USING (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL)
);
CREATE POLICY "maint_insert" ON machinery_maintenance FOR INSERT WITH CHECK (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL)
);
CREATE POLICY "maint_update" ON machinery_maintenance FOR UPDATE USING (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND role IN ('owner','capataz','manager') AND accepted_at IS NOT NULL)
);
CREATE POLICY "maint_delete" ON machinery_maintenance FOR DELETE USING (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND role IN ('owner','capataz') AND accepted_at IS NOT NULL)
);

-- fuel_logs policies
CREATE POLICY "fuel_select" ON fuel_logs FOR SELECT USING (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL)
);
CREATE POLICY "fuel_insert" ON fuel_logs FOR INSERT WITH CHECK (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND accepted_at IS NOT NULL)
);
CREATE POLICY "fuel_update" ON fuel_logs FOR UPDATE USING (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND role IN ('owner','capataz','manager') AND accepted_at IS NOT NULL)
);
CREATE POLICY "fuel_delete" ON fuel_logs FOR DELETE USING (
  farm_id IN (SELECT farm_id FROM farm_members WHERE user_id = auth.uid() AND role IN ('owner','capataz') AND accepted_at IS NOT NULL)
);

-- ── 5. Depreciation view ─────────────────────────────────────

CREATE OR REPLACE VIEW machinery_depreciation AS
SELECT
  m.id,
  m.farm_id,
  m.name                                       AS nombre,
  m.type                                       AS tipo,
  m.brand                                      AS marca,
  m.model                                      AS modelo,
  m.year                                       AS año,
  m.patente,
  m.purchase_price                             AS valor_compra,
  m.purchase_date                              AS fecha_compra,
  COALESCE(m.vida_util_años, 10)               AS vida_util_años,
  m.status                                     AS estado,
  COALESCE(m.horometro_actual, 0)              AS horometro_actual,
  m.notes                                      AS notas,
  -- Annual depreciation (straight-line)
  CASE WHEN COALESCE(m.vida_util_años, 10) > 0 AND m.purchase_price IS NOT NULL
    THEN ROUND(m.purchase_price / COALESCE(m.vida_util_años, 10), 2)
    ELSE NULL
  END AS depreciacion_anual,
  -- Book value today
  CASE WHEN m.purchase_date IS NOT NULL AND m.purchase_price IS NOT NULL
    THEN GREATEST(0, ROUND(
      m.purchase_price - (m.purchase_price / COALESCE(m.vida_util_años, 10))
        * EXTRACT(EPOCH FROM (NOW() - m.purchase_date::TIMESTAMPTZ)) / 31536000
    , 2))
    ELSE NULL
  END AS valor_libro
FROM machinery m;
