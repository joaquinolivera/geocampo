-- ============================================================
-- Migration 007: Lotes Comerciales (Herd Economics)
-- ============================================================
-- A "lote comercial" tracks the full lifecycle of a batch of
-- cattle from purchase through all cost events to final sale,
-- producing a per-batch P&L (ADG, cost/kg gain, ROI).
-- ============================================================

-- ── lotes_comerciales ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lotes_comerciales (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  farm_id         UUID        REFERENCES farms(id) ON DELETE CASCADE NOT NULL,

  -- Identity
  nombre          TEXT        NOT NULL,
  descripcion     TEXT,

  -- Entry (compra / ingreso propio)
  fecha_entrada   DATE        NOT NULL,
  cabezas_entrada INTEGER     NOT NULL CHECK (cabezas_entrada > 0),
  peso_entrada_kg NUMERIC(8,2),           -- average kg / head on entry
  costo_entrada   NUMERIC(12,2) DEFAULT 0, -- total purchase cost (ARS or USD)
  moneda          TEXT        NOT NULL DEFAULT 'USD' CHECK (moneda IN ('USD', 'ARS')),

  -- Exit (venta / faena)
  fecha_salida    DATE,
  cabezas_salida  INTEGER,
  peso_salida_kg  NUMERIC(8,2),           -- average kg / head on exit
  ingreso_venta   NUMERIC(12,2),

  -- Computed (maintained by trigger, also calculated client-side)
  dias_engorde    INTEGER     GENERATED ALWAYS AS (
                                CASE WHEN fecha_salida IS NOT NULL
                                  THEN (fecha_salida - fecha_entrada)
                                  ELSE NULL
                                END
                              ) STORED,

  -- Status
  estado          TEXT        NOT NULL DEFAULT 'abierto'
                              CHECK (estado IN ('abierto', 'cerrado', 'cancelado')),

  -- Audit
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lotes_farm    ON lotes_comerciales(farm_id);
CREATE INDEX IF NOT EXISTS idx_lotes_estado  ON lotes_comerciales(farm_id, estado);

-- ── gastos_lote ───────────────────────────────────────────────
-- Individual cost events during the feeding period

CREATE TABLE IF NOT EXISTS gastos_lote (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  lote_id         UUID        REFERENCES lotes_comerciales(id) ON DELETE CASCADE NOT NULL,
  farm_id         UUID        REFERENCES farms(id) ON DELETE CASCADE NOT NULL,

  fecha           DATE        NOT NULL DEFAULT CURRENT_DATE,
  categoria       TEXT        NOT NULL
                              CHECK (categoria IN (
                                'sanidad', 'alimentacion', 'mano_de_obra',
                                'flete', 'impuesto', 'infraestructura', 'otro'
                              )),
  descripcion     TEXT,
  monto           NUMERIC(12,2) NOT NULL CHECK (monto >= 0),
  moneda          TEXT        NOT NULL DEFAULT 'USD' CHECK (moneda IN ('USD', 'ARS')),

  registrado_por  UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gastos_lote_id  ON gastos_lote(lote_id);
CREATE INDEX IF NOT EXISTS idx_gastos_farm_id  ON gastos_lote(farm_id);

-- ── updated_at trigger ───────────────────────────────────────

CREATE OR REPLACE FUNCTION update_lote_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER lotes_updated_at
  BEFORE UPDATE ON lotes_comerciales
  FOR EACH ROW EXECUTE FUNCTION update_lote_updated_at();

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE lotes_comerciales ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_lote       ENABLE ROW LEVEL SECURITY;

-- lotes_comerciales: readable by all farm members, writable by owner/capataz
CREATE POLICY "lotes_select" ON lotes_comerciales
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "lotes_insert" ON lotes_comerciales
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'capataz', 'manager')
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "lotes_update" ON lotes_comerciales
  FOR UPDATE USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'capataz', 'manager')
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "lotes_delete" ON lotes_comerciales
  FOR DELETE USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE user_id = auth.uid() AND role = 'owner' AND accepted_at IS NOT NULL
    )
  );

-- gastos_lote: same rules
CREATE POLICY "gastos_select" ON gastos_lote
  FOR SELECT USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE user_id = auth.uid() AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "gastos_insert" ON gastos_lote
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'capataz', 'manager', 'empleado', 'employee')
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "gastos_update" ON gastos_lote
  FOR UPDATE USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'capataz', 'manager')
        AND accepted_at IS NOT NULL
    )
  );

CREATE POLICY "gastos_delete" ON gastos_lote
  FOR DELETE USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'capataz') AND accepted_at IS NOT NULL
    )
  );

-- ── View: lote_pnl ───────────────────────────────────────────
-- Computes P&L metrics per lote in real time

CREATE OR REPLACE VIEW lote_pnl AS
SELECT
  l.id,
  l.farm_id,
  l.nombre,
  l.estado,
  l.fecha_entrada,
  l.fecha_salida,
  l.cabezas_entrada,
  l.cabezas_salida,
  l.peso_entrada_kg,
  l.peso_salida_kg,
  l.dias_engorde,
  l.moneda,
  l.costo_entrada,
  l.ingreso_venta,

  -- Total costs
  COALESCE(g.total_gastos, 0)                       AS total_gastos,
  l.costo_entrada + COALESCE(g.total_gastos, 0)     AS costo_total,

  -- P&L
  COALESCE(l.ingreso_venta, 0)
    - l.costo_entrada
    - COALESCE(g.total_gastos, 0)                   AS resultado_neto,

  -- Per-head metrics
  CASE WHEN COALESCE(l.cabezas_salida, l.cabezas_entrada) > 0
    THEN (COALESCE(l.ingreso_venta, 0) - l.costo_entrada - COALESCE(g.total_gastos, 0))
         / COALESCE(l.cabezas_salida, l.cabezas_entrada)
    ELSE NULL
  END                                                AS resultado_por_cabeza,

  -- ADG (average daily gain kg/head/day)
  CASE WHEN l.dias_engorde > 0 AND l.cabezas_entrada > 0
       AND l.peso_salida_kg IS NOT NULL AND l.peso_entrada_kg IS NOT NULL
    THEN (l.peso_salida_kg - l.peso_entrada_kg) / l.dias_engorde
    ELSE NULL
  END                                                AS adg_kg_dia,

  -- ROI %
  CASE WHEN (l.costo_entrada + COALESCE(g.total_gastos, 0)) > 0
    THEN ROUND(
      100.0 * (COALESCE(l.ingreso_venta, 0) - l.costo_entrada - COALESCE(g.total_gastos, 0))
      / (l.costo_entrada + COALESCE(g.total_gastos, 0))
    , 2)
    ELSE NULL
  END                                                AS roi_pct

FROM lotes_comerciales l
LEFT JOIN (
  SELECT lote_id, SUM(monto) AS total_gastos
  FROM gastos_lote
  GROUP BY lote_id
) g ON g.lote_id = l.id;
