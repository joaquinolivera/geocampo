/**
 * @fileoverview PowerSync Conflict Resolution Service
 * Implements Last Write Wins (LWW) strategy using updated_at timestamps.
 * 
 * When offline users modify the same record, the version with the most
 * recent timestamp wins. This is declared in Phase 3 of the master prompt.
 */

export interface ConflictRecord {
  id: string;
  table: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localUpdatedAt: number;
  serverUpdatedAt: number;
}

export interface ResolutionResult {
  winner: 'local' | 'server' | 'merge';
  data: Record<string, unknown>;
  resolvedAt: number;
}

/**
 * Resolve a sync conflict using Last Write Wins strategy
 * Compares updated_at timestamps; the most recent write prevails.
 * 
 * @param conflict The conflicting local and server records
 * @returns ResolutionResult with the winning data and strategy used
 */
export function resolveConflictLWW(conflict: ConflictRecord): ResolutionResult {
  const { localData, serverData, localUpdatedAt, serverUpdatedAt } = conflict;
  const now = Date.now();

  // Last Write Wins: compare timestamps
  if (localUpdatedAt > serverUpdatedAt) {
    return {
      winner: 'local',
      data: localData,
      resolvedAt: now,
    };
  }

  if (serverUpdatedAt > localUpdatedAt) {
    return {
      winner: 'server',
      data: serverData,
      resolvedAt: now,
    };
  }

  // Phase 3: Edge case - timestamps are identical (rare, but possible with clock sync)
  // Prefer server data to ensure convergence across clients
  return {
    winner: 'server',
    data: serverData,
    resolvedAt: now,
  };
}

/**
 * Batch resolve multiple conflicts
 * @param conflicts Array of conflict records
 * @returns Array of resolution results in same order
 */
export function resolveConflictsBatch(conflicts: ConflictRecord[]): ResolutionResult[] {
  return conflicts.map((conflict) => resolveConflictLWW(conflict));
}

/**
 * Check if a record needs conflict resolution
 * @param localRecord Local version of the record
 * @param serverRecord Server version of the record
 * @returns true if timestamps differ (potential conflict)
 */
export function hasConflict(
  localRecord: { updated_at?: number },
  serverRecord: { updated_at?: number }
): boolean {
  // If either record lacks timestamp, assume conflict for safety
  if (!localRecord.updated_at || !serverRecord.updated_at) {
    return true;
  }

  return localRecord.updated_at !== serverRecord.updated_at;
}

/**
 * Merge fields when both local and server modified different columns.
 * Falls back to LWW when the same field was modified.
 * 
 * Phase 3 enhancement: For fields where both sides differ, use LWW.
 * For fields where only one side changed, keep the changed value.
 */
export function mergeRecordsLWW(
  localData: Record<string, unknown>,
  serverData: Record<string, unknown>,
  localUpdatedAt: number,
  serverUpdatedAt: number
): Record<string, unknown> {
  const winner = localUpdatedAt >= serverUpdatedAt ? localData : serverData;
  const loser = localUpdatedAt >= serverUpdatedAt ? serverData : localData;
  const merged: Record<string, unknown> = {};

  // Get all unique keys from both records
  const allKeys = new Set([...Object.keys(winner), ...Object.keys(loser)]);

  for (const key of allKeys) {
    if (key === 'id' || key === 'updated_at' || key === 'created_at') {
      // Preserve immutable fields from winner
      merged[key] = winner[key];
      continue;
    }

    const localValue = localData[key];
    const serverValue = serverData[key];

    if (localValue === serverValue) {
      // Both sides agree
      merged[key] = localValue;
    } else if (localValue === undefined) {
      // Only server has value
      merged[key] = serverValue;
    } else if (serverValue === undefined) {
      // Only local has value
      merged[key] = localValue;
    } else {
      // Both sides have explicit values (including null) - Last Write Wins
      merged[key] = winner[key];
    }
  }

  // Always update the resolved timestamp
  merged.updated_at = Date.now();

  return merged;
}
