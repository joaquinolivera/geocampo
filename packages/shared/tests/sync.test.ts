/**
 * @fileoverview Phase 3 TDD: PowerSync Conflict Resolution Tests
 * Tests Last Write Wins (LWW) strategy and merge logic.
 */

import {
  resolveConflictLWW,
  resolveConflictsBatch,
  hasConflict,
  mergeRecordsLWW,
  ConflictRecord,
} from '../src/utils/sync';

describe('PowerSync Conflict Resolution (Last Write Wins)', () => {
  describe('resolveConflictLWW', () => {
    it('should choose local data when local timestamp is newer', () => {
      const conflict: ConflictRecord = {
        id: 'herd-1',
        table: 'herds',
        localData: { name: 'Herd A Updated', cattle_count: 50 },
        serverData: { name: 'Herd A', cattle_count: 45 },
        localUpdatedAt: 1700000000000,
        serverUpdatedAt: 1600000000000,
      };

      const result = resolveConflictLWW(conflict);

      expect(result.winner).toBe('local');
      expect(result.data).toEqual(conflict.localData);
      expect(result.resolvedAt).toBeGreaterThan(0);
    });

    it('should choose server data when server timestamp is newer', () => {
      const conflict: ConflictRecord = {
        id: 'herd-1',
        table: 'herds',
        localData: { name: 'Herd A', cattle_count: 45 },
        serverData: { name: 'Herd A Updated', cattle_count: 55 },
        localUpdatedAt: 1600000000000,
        serverUpdatedAt: 1700000000000,
      };

      const result = resolveConflictLWW(conflict);

      expect(result.winner).toBe('server');
      expect(result.data).toEqual(conflict.serverData);
    });

    it('should prefer server when timestamps are identical', () => {
      const conflict: ConflictRecord = {
        id: 'herd-1',
        table: 'herds',
        localData: { name: 'Herd A Local' },
        serverData: { name: 'Herd A Server' },
        localUpdatedAt: 1700000000000,
        serverUpdatedAt: 1700000000000,
      };

      const result = resolveConflictLWW(conflict);

      expect(result.winner).toBe('server');
      expect(result.data).toEqual(conflict.serverData);
    });
  });

  describe('resolveConflictsBatch', () => {
    it('should resolve multiple conflicts in order', () => {
      const conflicts: ConflictRecord[] = [
        {
          id: 'herd-1',
          table: 'herds',
          localData: { name: 'Local Winner' },
          serverData: { name: 'Server Value' },
          localUpdatedAt: 1700000000000,
          serverUpdatedAt: 1600000000000,
        },
        {
          id: 'pasture-1',
          table: 'pastures',
          localData: { name: 'Local Value' },
          serverData: { name: 'Server Winner' },
          localUpdatedAt: 1600000000000,
          serverUpdatedAt: 1700000000000,
        },
      ];

      const results = resolveConflictsBatch(conflicts);

      expect(results).toHaveLength(2);
      expect(results[0].winner).toBe('local');
      expect(results[1].winner).toBe('server');
    });

    it('should handle empty conflicts array', () => {
      const results = resolveConflictsBatch([]);
      expect(results).toEqual([]);
    });
  });

  describe('hasConflict', () => {
    it('should return true when timestamps differ', () => {
      const localRecord = { updated_at: 1700000000000 };
      const serverRecord = { updated_at: 1600000000000 };

      expect(hasConflict(localRecord, serverRecord)).toBe(true);
    });

    it('should return false when timestamps match', () => {
      const localRecord = { updated_at: 1700000000000 };
      const serverRecord = { updated_at: 1700000000000 };

      expect(hasConflict(localRecord, serverRecord)).toBe(false);
    });

    it('should return true when local record lacks timestamp', () => {
      const localRecord = {};
      const serverRecord = { updated_at: 1700000000000 };

      expect(hasConflict(localRecord, serverRecord)).toBe(true);
    });

    it('should return true when server record lacks timestamp', () => {
      const localRecord = { updated_at: 1700000000000 };
      const serverRecord = {};

      expect(hasConflict(localRecord, serverRecord)).toBe(true);
    });
  });

  describe('mergeRecordsLWW', () => {
    it('should merge non-conflicting fields from both records', () => {
      const localData = { name: 'Herd A', breed: 'Angus', updated_at: 1600000000000 };
      const serverData = { name: 'Herd A', cattle_count: 50, updated_at: 1700000000000 };

      const merged = mergeRecordsLWW(localData, serverData, 1600000000000, 1700000000000);

      // Server wins (newer timestamp)
      expect(merged.name).toBe('Herd A'); // Same on both
      expect(merged.cattle_count).toBe(50); // From server
      expect(merged.breed).toBe('Angus'); // From local (only local had it)
      expect(merged.updated_at).toBeGreaterThan(1700000000000); // Fresh timestamp
    });

    it('should use LWW when same field modified on both sides', () => {
      const localData = { name: 'Herd A Local', updated_at: 1700000000000 };
      const serverData = { name: 'Herd A Server', updated_at: 1600000000000 };

      const merged = mergeRecordsLWW(localData, serverData, 1700000000000, 1600000000000);

      // Local wins (newer timestamp)
      expect(merged.name).toBe('Herd A Local');
    });

    it('should preserve id and timestamps as immutable', () => {
      const localData = { id: 'herd-1', name: 'Local', updated_at: 1600000000000, created_at: 1500000000000 };
      const serverData = { id: 'herd-1', name: 'Server', updated_at: 1700000000000, created_at: 1500000000000 };

      const merged = mergeRecordsLWW(localData, serverData, 1600000000000, 1700000000000);

      expect(merged.id).toBe('herd-1');
      expect(merged.created_at).toBe(1500000000000);
    });

    it('should handle null values correctly', () => {
      const localData = { name: 'Herd A', exit_date: null, updated_at: 1700000000000 };
      const serverData = { name: 'Herd A', exit_date: 1700000000000, updated_at: 1600000000000 };

      const merged = mergeRecordsLWW(localData, serverData, 1700000000000, 1600000000000);

      // Local wins, exit_date was explicitly set to null
      expect(merged.exit_date).toBeNull();
    });
  });
});
