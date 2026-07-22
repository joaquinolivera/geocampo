-- ============================================================
-- Migration 011: grazing_log + rainfall_log tables
-- ============================================================

-- ── grazing_log ───────────────────────────────────────────────
-- Tracks which herd grazed which pasture, with start/end dates.
-- Used for rotation history and rest-period calculations.

CREATE TABLE IF NOT EXISTS grazing_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id       UUID        NOT NULL REFERENCES farms(id)    ON DELETE CASCADE,
  pasture_id    UUID        NOT NULL REFERENCES pastures(id) ON DELETE CASCADE,
  herd_id       UUID                    REFERENCES herds(id) ON DELETE SET NULL,
  herd_name     TEXT        NOT NULL DEFAULT '',
  start_date    DATE        NOT NULL,
  end_date      DATE,                  -- NULL = currently grazing
  days_rested   INT,                   -- computed at close-out (optional)
  notes         TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_grazing_pasture ON grazing_log(pasture_id);
CREATE INDEX IF NOT EXISTS idx_grazing_herd    ON grazing_log(herd_id);
CREATE INDEX IF NOT EXISTS idx_grazing_farm    ON grazing_log(farm_id);

ALTER TABLE grazing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grazing_select" ON grazing_log
  FOR SELECT USING (auth_is_farm_member(farm_id));

CREATE POLICY "grazing_insert" ON grazing_log
  FOR INSERT WITH CHECK (auth_is_farm_member(farm_id));

CREATE POLICY "grazing_update" ON grazing_log
  FOR UPDATE USING (auth_is_farm_member(farm_id));

CREATE POLICY "grazing_delete" ON grazing_log
  FOR DELETE USING (auth_is_farm_owner(farm_id));

-- ── rainfall_log ──────────────────────────────────────────────
-- Manual rainfall readings. pasture_id is nullable (farm-wide entry).

CREATE TABLE IF NOT EXISTS rainfall_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id       UUID        NOT NULL REFERENCES farms(id)    ON DELETE CASCADE,
  pasture_id    UUID                    REFERENCES pastures(id) ON DELETE SET NULL,
  date          DATE        NOT NULL DEFAULT CURRENT_DATE,
  mm            NUMERIC(6,1) NOT NULL CHECK (mm >= 0),
  notes         TEXT,
  recorded_by   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rainfall_farm    ON rainfall_log(farm_id);
CREATE INDEX IF NOT EXISTS idx_rainfall_pasture ON rainfall_log(pasture_id);
CREATE INDEX IF NOT EXISTS idx_rainfall_date    ON rainfall_log(date DESC);

ALTER TABLE rainfall_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rainfall_select" ON rainfall_log
  FOR SELECT USING (auth_is_farm_member(farm_id));

CREATE POLICY "rainfall_insert" ON rainfall_log
  FOR INSERT WITH CHECK (auth_is_farm_member(farm_id));

CREATE POLICY "rainfall_update" ON rainfall_log
  FOR UPDATE USING (auth_is_farm_member(farm_id));

CREATE POLICY "rainfall_delete" ON rainfall_log
  FOR DELETE USING (auth_is_farm_owner(farm_id));

NOTIFY pgrst, 'reload schema';
