/**
 * @fileoverview Weight Service Tests
 */

import { recordWeight, getWeightsForHerd, getLatestWeight } from '@/services/weights';

const mockExecute = jest.fn().mockResolvedValue(undefined);
const mockGetAll = jest.fn().mockResolvedValue([]);
const mockGetOptional = jest.fn().mockResolvedValue(null);

const mockDb = {
  execute: mockExecute,
  getAll: mockGetAll,
  getOptional: mockGetOptional,
} as any;

describe('Weight Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('recordWeight', () => {
    it('inserts a weight record with calculated average', async () => {
      const record = await recordWeight(mockDb, {
        herdId: 'herd-1',
        weightKg: 13500,
        cattleCount: 30,
        weighedBy: 'juan@estancia.com',
      });

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const [sql, params] = mockExecute.mock.calls[0];
      expect(sql).toContain('INSERT INTO weights');
      expect(params).toContain('herd-1');
      expect(params).toContain(13500);
      expect(params).toContain(30);
      expect(params).toContain(450); // average: 13500 / 30
    });

    it('returns the inserted record', async () => {
      const record = await recordWeight(mockDb, {
        herdId: 'herd-1',
        weightKg: 9000,
        cattleCount: 20,
      });

      expect(record.herd_id).toBe('herd-1');
      expect(record.weight_kg).toBe(9000);
      expect(record.cattle_count).toBe(20);
      expect(record.average_weight_kg).toBe(450);
      expect(record.id).toBeTruthy();
    });

    it('uses provided weighedAt date', async () => {
      const date = new Date('2026-01-15');
      await recordWeight(mockDb, {
        herdId: 'herd-1',
        weightKg: 9000,
        cattleCount: 20,
        weighedAt: date,
      });

      const params = mockExecute.mock.calls[0][1];
      expect(params).toContain(date.getTime());
    });

    it('defaults weighedBy to "system"', async () => {
      await recordWeight(mockDb, {
        herdId: 'herd-1',
        weightKg: 9000,
        cattleCount: 20,
      });

      const params = mockExecute.mock.calls[0][1];
      expect(params).toContain('system');
    });
  });

  describe('getWeightsForHerd', () => {
    it('queries weights ordered by date descending', async () => {
      await getWeightsForHerd(mockDb, 'herd-1');

      const [sql, params] = mockGetAll.mock.calls[0];
      expect(sql).toContain('WHERE herd_id = ?');
      expect(sql).toContain('ORDER BY weighed_at DESC');
      expect(params).toContain('herd-1');
    });
  });

  describe('getLatestWeight', () => {
    it('queries the single most recent weight', async () => {
      await getLatestWeight(mockDb, 'herd-1');

      const [sql, params] = mockGetOptional.mock.calls[0];
      expect(sql).toContain('LIMIT 1');
      expect(sql).toContain('ORDER BY weighed_at DESC');
      expect(params).toContain('herd-1');
    });

    it('returns null when no record found', async () => {
      mockGetOptional.mockResolvedValueOnce(null);
      const result = await getLatestWeight(mockDb, 'herd-1');
      expect(result).toBeNull();
    });
  });
});
