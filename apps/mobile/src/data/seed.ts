/**
 * @fileoverview Demo seed data for GeoCampo MVP
 * Used when PowerSync DB is not yet connected.
 * Mirrors the DB schema exactly — swap for real queries when Supabase is live.
 */

import type { Pasture, Herd } from '@geocampo/shared';
import { WeightRecord } from '@/services/weights';
import { HealthRecord } from '@/services/health';

// Helper to build a Date offset from today
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Farm ────────────────────────────────────────────────────────────────────

export const DEMO_FARM = {
  id: 'farm-1',
  name: 'Estancia Las Pampas',
  ownerName: 'Roberto Álvarez',
  totalAreaHectares: 320.5,
};

// ─── Pastures ─────────────────────────────────────────────────────────────────

export interface DemoPasture extends Omit<Pasture, 'createdAt' | 'updatedAt'> {
  color: string;
  coordinate?: [number, number];
}

export const DEMO_PASTURES: DemoPasture[] = [
  {
    id: 'pasture-1',
    name: 'Potrero Norte',
    color: '#DEFF9A',
    areaHectares: 45.2,
    carryingCapacity: 50,
    farmId: 'farm-1',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-58.42, -34.58],
          [-58.38, -34.58],
          [-58.38, -34.62],
          [-58.42, -34.62],
          [-58.42, -34.58],
        ],
      ],
    },
  },
  {
    id: 'pasture-2',
    name: 'Potrero Sur',
    color: '#9ADEFF',
    areaHectares: 32.8,
    carryingCapacity: 35,
    farmId: 'farm-1',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-58.42, -34.63],
          [-58.38, -34.63],
          [-58.38, -34.67],
          [-58.42, -34.67],
          [-58.42, -34.63],
        ],
      ],
    },
  },
  {
    id: 'pasture-3',
    name: 'Potrero Este',
    color: '#FF9ADE',
    areaHectares: 28.5,
    carryingCapacity: 25, // ← overloaded! herd has 28
    farmId: 'farm-1',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-58.37, -34.60],
          [-58.33, -34.60],
          [-58.33, -34.65],
          [-58.37, -34.65],
          [-58.37, -34.60],
        ],
      ],
    },
  },
];

// ─── Herds ───────────────────────────────────────────────────────────────────

export interface DemoHerd extends Omit<Herd, 'createdAt' | 'updatedAt'> {
  coordinate: [number, number]; // for map rendering
}

export const DEMO_HERDS: DemoHerd[] = [
  {
    id: 'herd-1',
    name: 'Vacas Preñadas Lote A',
    pastureId: 'pasture-1',
    cattleCount: 45,
    breed: 'Hereford',
    status: 'active',
    farmId: 'farm-1',
    entryDate: daysAgo(120),
    coordinate: [-58.40, -34.60],
  },
  {
    id: 'herd-2',
    name: 'Novillos Lote B',
    pastureId: 'pasture-2',
    cattleCount: 32,
    breed: 'Aberdeen Angus',
    status: 'active',
    farmId: 'farm-1',
    entryDate: daysAgo(90),
    coordinate: [-58.40, -34.65],
  },
  {
    id: 'herd-3',
    name: 'Vaquillas Lote C',
    pastureId: 'pasture-3',
    cattleCount: 28, // ← exceeds capacity of 25
    breed: 'Hereford',
    status: 'active',
    farmId: 'farm-1',
    entryDate: daysAgo(60),
    coordinate: [-58.35, -34.625],
  },
];

// ─── Weights ─────────────────────────────────────────────────────────────────

export const DEMO_WEIGHTS: WeightRecord[] = [
  // Herd 1 — 2 records, ADG = 1.0 kg/day
  {
    id: 'w-1',
    herd_id: 'herd-1',
    weight_kg: 18900,
    cattle_count: 45,
    average_weight_kg: 420,
    weighed_at: daysAgo(60).getTime(),
    weighed_by: 'Roberto Álvarez',
    notes: 'Pesaje inicial lote A',
    created_at: daysAgo(60).getTime(),
  },
  {
    id: 'w-2',
    herd_id: 'herd-1',
    weight_kg: 20250,
    cattle_count: 45,
    average_weight_kg: 450,
    weighed_at: daysAgo(30).getTime(),
    weighed_by: 'Roberto Álvarez',
    notes: null,
    created_at: daysAgo(30).getTime(),
  },
  // Herd 2 — 2 records, ADG = 1.33 kg/day
  {
    id: 'w-3',
    herd_id: 'herd-2',
    weight_kg: 12800,
    cattle_count: 32,
    average_weight_kg: 400,
    weighed_at: daysAgo(45).getTime(),
    weighed_by: 'Roberto Álvarez',
    notes: null,
    created_at: daysAgo(45).getTime(),
  },
  {
    id: 'w-4',
    herd_id: 'herd-2',
    weight_kg: 14080,
    cattle_count: 32,
    average_weight_kg: 440,
    weighed_at: daysAgo(15).getTime(),
    weighed_by: 'Roberto Álvarez',
    notes: null,
    created_at: daysAgo(15).getTime(),
  },
  // Herd 3 — 1 record only (no ADG yet)
  {
    id: 'w-5',
    herd_id: 'herd-3',
    weight_kg: 8680,
    cattle_count: 28,
    average_weight_kg: 310,
    weighed_at: daysAgo(20).getTime(),
    weighed_by: 'Roberto Álvarez',
    notes: 'Vaquillas recién ingresadas',
    created_at: daysAgo(20).getTime(),
  },
];

// ─── Health ──────────────────────────────────────────────────────────────────

export const DEMO_HEALTH: HealthRecord[] = [
  // Herd 2 — OVERDUE deworming (3 days ago)
  {
    id: 'h-1',
    herd_id: 'herd-2',
    treatment_type: 'deworming',
    product_name: 'Dectomax',
    dosage: '1ml/50kg',
    administered_by: 'Dr. García',
    administered_at: daysAgo(93).getTime(),
    next_due_date: daysAgo(3).getTime(), // OVERDUE
    notes: null,
    created_at: daysAgo(93).getTime(),
  },
  // Herd 1 — URGENT vaccination in 5 days
  {
    id: 'h-2',
    herd_id: 'herd-1',
    treatment_type: 'vaccination',
    product_name: 'Clostrisan',
    dosage: '2ml',
    administered_by: 'Dr. García',
    administered_at: daysAgo(180).getTime(),
    next_due_date: daysFromNow(5).getTime(), // URGENT
    notes: 'Refuerzo anual clostridios',
    created_at: daysAgo(180).getTime(),
  },
  // Herd 3 — UPCOMING checkup in 14 days
  {
    id: 'h-3',
    herd_id: 'herd-3',
    treatment_type: 'checkup',
    product_name: null,
    dosage: null,
    administered_by: 'Dr. García',
    administered_at: daysAgo(45).getTime(),
    next_due_date: daysFromNow(14).getTime(), // UPCOMING
    notes: 'Control preñez vaquillas',
    created_at: daysAgo(45).getTime(),
  },
  // Herd 1 — past treatment (no next_due_date, archived)
  {
    id: 'h-4',
    herd_id: 'herd-1',
    treatment_type: 'treatment',
    product_name: 'Oxitetraciclina',
    dosage: '5ml',
    administered_by: 'Dr. García',
    administered_at: daysAgo(20).getTime(),
    next_due_date: null,
    notes: 'Vaca 42 — lesión en pata',
    created_at: daysAgo(20).getTime(),
  },
];
