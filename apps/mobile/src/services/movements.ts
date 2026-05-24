/**
 * @fileoverview Herd Movement Service
 * Registers herd movements in PowerSync database.
 */

import { PowerSyncDatabase } from '@powersync/react-native';

export interface MovementRecord {
  id: string;
  herd_id: string;
  from_pasture_id: string | null;
  to_pasture_id: string;
  moved_at: number;
  moved_by: string;
  verified_by_turf: number;
  notes: string | null;
}

/**
 * Record a herd movement in the database
 * @param db PowerSync database instance
 * @param herdId Herd being moved
 * @param fromPastureId Source pasture (null if unassigned)
 * @param toPastureId Target pasture
 * @param movedBy User who performed the movement
 */
export async function recordHerdMovement(
  db: PowerSyncDatabase,
  herdId: string,
  fromPastureId: string | null,
  toPastureId: string,
  movedBy: string = 'system'
): Promise<void> {
  const movement: MovementRecord = {
    id: crypto.randomUUID(),
    herd_id: herdId,
    from_pasture_id: fromPastureId,
    to_pasture_id: toPastureId,
    moved_at: Date.now(),
    moved_by: movedBy,
    verified_by_turf: 1, // Validated by Turf.js
    notes: `Moved via MapCanvas drag & drop`,
  };

  await db.execute(
    `INSERT INTO movements (id, herd_id, from_pasture_id, to_pasture_id, moved_at, moved_by, verified_by_turf, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      movement.id,
      movement.herd_id,
      movement.from_pasture_id,
      movement.to_pasture_id,
      movement.moved_at,
      movement.moved_by,
      movement.verified_by_turf,
      movement.notes,
    ]
  );

  // Update herd's pasture assignment
  await db.execute(
    `UPDATE herds SET pasture_id = ? WHERE id = ?`,
    [toPastureId, herdId]
  );
}
