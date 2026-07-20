-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 013 — Fix lote_pnl view: SECURITY INVOKER + RLS filter
-- ─────────────────────────────────────────────────────────────────────────────
-- Problem: the view was created without specifying security context, so
-- PostgreSQL defaulted to SECURITY DEFINER (runs as the view owner, bypassing
-- RLS). Any authenticated user could read lotes from any farm.
--
-- Fix: recreate with security_invoker = on so the view runs as the calling
-- user and RLS policies on lotes_comerciales and gastos_lote are enforced.
-- ─────────────────────────────────────────────────────────────────────────────

DROP VIEW IF EXISTS public.lote_pnl;

CREATE VIEW public.lote_pnl WITH (security_invoker = on) AS
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
