/**
 * @fileoverview Stocking Rate & Critical Load Alerts
 * Pure calculation functions for pasture carrying capacity analysis.
 * Follows Karpaty's Rule #2: Data/geometry before logic.
 */

import type { Weight } from '../types';

export type LoadStatus = 'ok' | 'warning' | 'critical';

export interface LoadAlert {
  pastureId: string;
  pastureName: string;
  cattleCount: number;
  carryingCapacity: number;
  capacityPercent: number;
  status: LoadStatus;
}

/**
 * Calculate stocking rate in heads per hectare.
 */
export function calculateStockingRate(
  cattleCount: number,
  areaHectares: number
): number {
  if (areaHectares <= 0) return 0;
  return cattleCount / areaHectares;
}

/**
 * Calculate occupancy as a percentage of declared carrying capacity.
 * Returns 0 if carryingCapacity is 0 or undefined.
 */
export function calculateCapacityPercent(
  cattleCount: number,
  carryingCapacity: number
): number {
  if (carryingCapacity <= 0) return 0;
  return (cattleCount / carryingCapacity) * 100;
}

/**
 * Determine load status from occupancy percentage.
 * - ok:       < 80%
 * - warning:  80% – 99%
 * - critical: ≥ 100%
 */
export function getLoadStatus(capacityPercent: number): LoadStatus {
  if (capacityPercent >= 100) return 'critical';
  if (capacityPercent >= 80) return 'warning';
  return 'ok';
}

/**
 * Build a LoadAlert for a single pasture.
 * Returns null if no carrying capacity is defined.
 */
export function buildLoadAlert(
  pastureId: string,
  pastureName: string,
  cattleCount: number,
  carryingCapacity: number | undefined
): LoadAlert | null {
  if (!carryingCapacity || carryingCapacity <= 0) return null;

  const capacityPercent = calculateCapacityPercent(cattleCount, carryingCapacity);
  const status = getLoadStatus(capacityPercent);

  return {
    pastureId,
    pastureName,
    cattleCount,
    carryingCapacity,
    capacityPercent: Math.round(capacityPercent),
    status,
  };
}

/**
 * Filter alerts to only those needing attention (warning or critical).
 */
export function getActiveAlerts(alerts: LoadAlert[]): LoadAlert[] {
  return alerts.filter((a) => a.status !== 'ok');
}

// ─── ADG (Average Daily Gain) ────────────────────────────────────────────────

/**
 * Calculate ADG in kg/day from an array of weight records.
 * Requires at least 2 records.
 * Records are sorted by weighedAt ascending internally.
 * Returns null when insufficient data.
 */
export function calculateADG(weights: Weight[]): number | null {
  if (weights.length < 2) return null;

  const sorted = [...weights].sort(
    (a, b) => a.weighedAt.getTime() - b.weighedAt.getTime()
  );

  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  const avgOld = oldest.averageWeightKg ?? oldest.weightKg / oldest.cattleCount;
  const avgNew = newest.averageWeightKg ?? newest.weightKg / newest.cattleCount;

  const daysDiff =
    (newest.weighedAt.getTime() - oldest.weighedAt.getTime()) /
    (1000 * 60 * 60 * 24);

  if (daysDiff <= 0) return null;

  return Math.round(((avgNew - avgOld) / daysDiff) * 100) / 100;
}

/**
 * Human-readable label for load status.
 */
export function loadStatusLabel(status: LoadStatus): string {
  switch (status) {
    case 'critical':
      return 'Sobrecarga crítica';
    case 'warning':
      return 'Cerca del límite';
    case 'ok':
      return 'Carga normal';
  }
}

/**
 * Color for load status (matches GeoCampo design system).
 */
export function loadStatusColor(status: LoadStatus): string {
  switch (status) {
    case 'critical':
      return '#FF4444';
    case 'warning':
      return '#FFB444';
    case 'ok':
      return '#DEFF9A';
  }
}
