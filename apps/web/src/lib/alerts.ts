/**
 * @fileoverview Alert calculation utilities for the web dashboard.
 * Mirrors @geocampo/shared/utils/alerts — inlined here to avoid
 * server-component import issues with the shared package.
 */

import type { Pasture, Herd, WeightRecord, HealthRecord } from './data';

// ─── Load status ──────────────────────────────────────────────────────────────

export type LoadStatus = 'ok' | 'warning' | 'critical';

export interface LoadAlert {
  pastureId: string;
  pastureName: string;
  cattleCount: number;
  carryingCapacity: number;
  capacityPercent: number;
  status: LoadStatus;
}

export function calculateCapacityPercent(cattleCount: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return (cattleCount / capacity) * 100;
}

export function getLoadStatus(pct: number): LoadStatus {
  if (pct >= 100) return 'critical';
  if (pct >= 80) return 'warning';
  return 'ok';
}

export function buildLoadAlert(
  pasture: Pasture,
  herd: Herd | undefined
): LoadAlert | null {
  if (!herd) return null;
  const pct = calculateCapacityPercent(herd.cattleCount, pasture.carryingCapacity);
  return {
    pastureId: pasture.id,
    pastureName: pasture.name,
    cattleCount: herd.cattleCount,
    carryingCapacity: pasture.carryingCapacity,
    capacityPercent: Math.round(pct),
    status: getLoadStatus(pct),
  };
}

export function loadStatusColor(status: LoadStatus): string {
  if (status === 'critical') return '#FF4444';
  if (status === 'warning') return '#FFB444';
  return '#DEFF9A';
}

export function loadStatusLabel(status: LoadStatus): string {
  if (status === 'critical') return 'Sobrecarga';
  if (status === 'warning') return 'Cerca del límite';
  return 'Normal';
}

// ─── ADG (Average Daily Gain) ─────────────────────────────────────────────────

export function calculateADG(weights: WeightRecord[]): number | null {
  if (weights.length < 2) return null;
  const sorted = [...weights].sort((a, b) => a.weighedAt.getTime() - b.weighedAt.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const days = (last.weighedAt.getTime() - first.weighedAt.getTime()) / 86_400_000;
  if (days <= 0) return null;
  return Math.round(((last.averageWeightKg - first.averageWeightKg) / days) * 10) / 10;
}

// ─── Health / due status ──────────────────────────────────────────────────────

export type DueStatus = 'overdue' | 'urgent' | 'upcoming' | 'ok';

export function daysUntilDue(date: Date): number {
  return Math.round((date.getTime() - Date.now()) / 86_400_000);
}

export function getDueStatus(date: Date): DueStatus {
  const days = daysUntilDue(date);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'upcoming';
  return 'ok';
}

export function dueStatusColor(status: DueStatus): string {
  if (status === 'overdue') return '#FF4444';
  if (status === 'urgent') return '#FFB444';
  if (status === 'upcoming') return '#DEFF9A';
  return '#6A6A6B';
}

export function treatmentTypeLabel(type: HealthRecord['treatmentType']): string {
  const map: Record<HealthRecord['treatmentType'], string> = {
    vaccination: 'Vacunación',
    deworming: 'Desparasitación',
    treatment: 'Tratamiento',
    checkup: 'Control veterinario',
  };
  return map[type];
}

// ─── Pasture health score ─────────────────────────────────────────────────────
// Derived from stocking load + days occupied.
// Simple heuristic that gives farmers an easy-to-read "state" of the pasture.

export type PastureHealthScore = 'excelente' | 'bueno' | 'atención' | 'crítico';

export function getPastureHealthScore(
  loadStatus: LoadStatus,
  daysOccupied: number
): PastureHealthScore {
  if (loadStatus === 'critical') return 'crítico';
  if (loadStatus === 'warning' && daysOccupied > 25) return 'atención';
  if (loadStatus === 'warning') return 'atención';
  if (daysOccupied > 30) return 'bueno'; // might need rotation
  return 'excelente';
}

export function pastureHealthColor(score: PastureHealthScore): string {
  if (score === 'crítico') return '#FF4444';
  if (score === 'atención') return '#FFB444';
  if (score === 'bueno') return '#DEFF9A';
  return '#4ADE80'; // bright green for excelente
}
