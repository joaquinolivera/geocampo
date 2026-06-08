/**
 * @fileoverview Weight Recording Service
 * Records cattle weight sessions and queries weight history per herd.
 */

import { PowerSyncDatabase } from '@powersync/react-native';

export interface WeightRecord {
  id: string;
  herd_id: string;
  weight_kg: number;
  cattle_count: number;
  average_weight_kg: number;
  weighed_at: number; // ms timestamp
  weighed_by: string;
  notes: string | null;
  created_at: number;
}

export interface RecordWeightInput {
  herdId: string;
  weightKg: number;
  cattleCount: number;
  weighedBy?: string;
  notes?: string;
  weighedAt?: Date;
}

/**
 * Record a new weight session for a herd.
 */
export async function recordWeight(
  db: PowerSyncDatabase,
  input: RecordWeightInput
): Promise<WeightRecord> {
  const now = Date.now();
  const weighedAt = input.weighedAt?.getTime() ?? now;
  const averageWeightKg = input.weightKg / input.cattleCount;

  const record: WeightRecord = {
    id: crypto.randomUUID(),
    herd_id: input.herdId,
    weight_kg: input.weightKg,
    cattle_count: input.cattleCount,
    average_weight_kg: Math.round(averageWeightKg * 100) / 100,
    weighed_at: weighedAt,
    weighed_by: input.weighedBy ?? 'system',
    notes: input.notes ?? null,
    created_at: now,
  };

  await db.execute(
    `INSERT INTO weights (id, herd_id, weight_kg, cattle_count, average_weight_kg, weighed_at, weighed_by, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.herd_id,
      record.weight_kg,
      record.cattle_count,
      record.average_weight_kg,
      record.weighed_at,
      record.weighed_by,
      record.notes,
      record.created_at,
    ]
  );

  return record;
}

/**
 * Fetch all weight records for a given herd, ordered by date descending.
 */
export async function getWeightsForHerd(
  db: PowerSyncDatabase,
  herdId: string
): Promise<WeightRecord[]> {
  const result = await db.getAll<WeightRecord>(
    `SELECT * FROM weights WHERE herd_id = ? ORDER BY weighed_at DESC`,
    [herdId]
  );
  return result;
}

/**
 * Fetch the most recent weight record for a herd.
 * Returns null if no records exist.
 */
export async function getLatestWeight(
  db: PowerSyncDatabase,
  herdId: string
): Promise<WeightRecord | null> {
  const result = await db.getOptional<WeightRecord>(
    `SELECT * FROM weights WHERE herd_id = ? ORDER BY weighed_at DESC LIMIT 1`,
    [herdId]
  );
  return result ?? null;
}
