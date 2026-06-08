/**
 * @fileoverview TDD tests for addWeightRecord() in farm-store.ts
 *
 * RED → GREEN → REFACTOR
 */

import {
  addWeightRecord,
  loadStoredFarm,
  saveStoredFarm,
  type StoredFarm,
} from '@/lib/farm-store';

// ─── localStorage mock ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFarm(overrides: Partial<StoredFarm> = {}): StoredFarm {
  return {
    id: 'farm-test',
    name: 'Test Farm',
    ownerName: 'Tester',
    totalAreaHectares: 100,
    location: [-57.0, -23.0],
    pastures: [],
    herds: [],
    infrastructure: [],
    movements: [],
    healthRecords: [],
    weightRecords: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => localStorageMock.clear());

describe('addWeightRecord()', () => {
  it('returns null when no farm is stored', () => {
    const result = addWeightRecord('herd-1', {
      cattleCount: 35,
      averageWeightKg: 320,
      weighedAt: new Date('2026-06-08'),
      weighedBy: 'Jose',
    });
    expect(result).toBeNull();
  });

  it('appends a WeightRecord to the farm and returns updated farm', () => {
    saveStoredFarm(makeFarm());

    const result = addWeightRecord('herd-1', {
      cattleCount: 35,
      averageWeightKg: 320,
      weighedAt: new Date('2026-06-08'),
      weighedBy: 'Jose',
    });

    expect(result).not.toBeNull();
    expect(result!.weightRecords).toHaveLength(1);
    const rec = result!.weightRecords[0];
    expect(rec.herdId).toBe('herd-1');
    expect(rec.cattleCount).toBe(35);
    expect(rec.averageWeightKg).toBe(320);
    expect(rec.weightKg).toBe(35 * 320);
    expect(rec.weighedBy).toBe('Jose');
    expect(rec.notes).toBeNull();
  });

  it('persists the new record to localStorage', () => {
    saveStoredFarm(makeFarm());

    addWeightRecord('herd-1', {
      cattleCount: 40,
      averageWeightKg: 300,
      weighedAt: new Date('2026-06-08'),
      weighedBy: 'Ana',
      notes: 'Post-weaning',
    });

    const loaded = loadStoredFarm();
    expect(loaded!.weightRecords).toHaveLength(1);
    expect(loaded!.weightRecords[0].notes).toBe('Post-weaning');
  });

  it('generates a unique id for each record', () => {
    saveStoredFarm(makeFarm());

    addWeightRecord('herd-1', { cattleCount: 10, averageWeightKg: 200, weighedAt: new Date(), weighedBy: 'x' });
    addWeightRecord('herd-1', { cattleCount: 10, averageWeightKg: 210, weighedAt: new Date(), weighedBy: 'x' });

    const loaded = loadStoredFarm();
    const ids = loaded!.weightRecords.map((r) => r.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('appends without overwriting existing records', () => {
    const existing = makeFarm({
      weightRecords: [
        {
          id: 'w-existing',
          herdId: 'herd-1',
          weightKg: 9000,
          cattleCount: 30,
          averageWeightKg: 300,
          weighedAt: new Date('2026-01-01') as unknown as Date,
          weighedBy: 'Old Entry',
          notes: null,
        },
      ],
    });
    saveStoredFarm(existing);

    const result = addWeightRecord('herd-1', {
      cattleCount: 30,
      averageWeightKg: 320,
      weighedAt: new Date('2026-06-08'),
      weighedBy: 'New Entry',
    });

    expect(result!.weightRecords).toHaveLength(2);
    expect(result!.weightRecords[0].id).toBe('w-existing');
    expect(result!.weightRecords[1].weighedBy).toBe('New Entry');
  });

  it('calculates totalWeightKg as cattleCount × averageWeightKg', () => {
    saveStoredFarm(makeFarm());

    const result = addWeightRecord('herd-2', {
      cattleCount: 50,
      averageWeightKg: 450,
      weighedAt: new Date(),
      weighedBy: 'Luis',
    });

    expect(result!.weightRecords[0].weightKg).toBe(22_500);
  });
});
