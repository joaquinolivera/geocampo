/**
 * @fileoverview TDD tests for moveHerd() in farm-store.ts
 */

import {
  moveHerd,
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

function makeFarm(overrides: Partial<StoredFarm> = {}): StoredFarm {
  return {
    id: 'farm-test',
    name: 'Test Farm',
    ownerName: 'Tester',
    totalAreaHectares: 200,
    location: [-57.0, -23.0],
    pastures: [
      {
        id: 'pasture-1',
        name: 'Lote 1',
        areaHectares: 50,
        carryingCapacity: 40,
        color: '#DEFF9A',
        geometry: { type: 'Polygon', coordinates: [[[-57, -23], [-57.1, -23], [-57.1, -23.1], [-57, -23.1], [-57, -23]]] },
      },
      {
        id: 'pasture-2',
        name: 'Lote 2',
        areaHectares: 50,
        carryingCapacity: 40,
        color: '#DEFF9A',
        geometry: { type: 'Polygon', coordinates: [[[-57.2, -23], [-57.3, -23], [-57.3, -23.1], [-57.2, -23.1], [-57.2, -23]]] },
      },
    ],
    herds: [
      {
        id: 'herd-1',
        name: 'Lote 4a',
        pastureId: 'pasture-1',
        cattleCount: 35,
        breed: 'Hereford',
        status: 'active',
        entryDate: new Date('2026-05-01') as unknown as Date,
        coordinate: [-57.05, -23.05],
      },
    ],
    infrastructure: [],
    movements: [],
    healthRecords: [],
    weightRecords: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => localStorageMock.clear());

describe('moveHerd()', () => {
  it('returns null when no farm is stored', () => {
    const result = moveHerd('herd-1', {
      toPastureId: 'pasture-2',
      movedAt: new Date(),
      movedBy: 'Jose',
    });
    expect(result).toBeNull();
  });

  it('returns null when herd is not found', () => {
    saveStoredFarm(makeFarm());

    const result = moveHerd('herd-nonexistent', {
      toPastureId: 'pasture-2',
      movedAt: new Date(),
      movedBy: 'Jose',
    });
    expect(result).toBeNull();
  });

  it('updates the herd pastureId', () => {
    saveStoredFarm(makeFarm());

    const result = moveHerd('herd-1', {
      toPastureId: 'pasture-2',
      movedAt: new Date('2026-06-08'),
      movedBy: 'Jose',
    });

    expect(result).not.toBeNull();
    const herd = result!.herds.find((h) => h.id === 'herd-1');
    expect(herd!.pastureId).toBe('pasture-2');
  });

  it('resets entryDate to the move date', () => {
    saveStoredFarm(makeFarm());
    const moveDate = new Date('2026-06-08');

    const result = moveHerd('herd-1', {
      toPastureId: 'pasture-2',
      movedAt: moveDate,
      movedBy: 'Jose',
    });

    const herd = result!.herds.find((h) => h.id === 'herd-1');
    expect(new Date(herd!.entryDate as unknown as string).toISOString()).toBe(moveDate.toISOString());
  });

  it('updates the herd coordinate to the new pasture centroid', () => {
    saveStoredFarm(makeFarm());

    const result = moveHerd('herd-1', {
      toPastureId: 'pasture-2',
      movedAt: new Date(),
      movedBy: 'Jose',
    });

    const herd = result!.herds.find((h) => h.id === 'herd-1');
    // Centroid of pasture-2's ring (rough check — just not pasture-1's coords)
    expect(herd!.coordinate[0]).not.toBeCloseTo(-57.05, 1);
  });

  it('appends a Movement record', () => {
    saveStoredFarm(makeFarm());

    const result = moveHerd('herd-1', {
      toPastureId: 'pasture-2',
      movedAt: new Date('2026-06-08'),
      movedBy: 'Jose',
      notes: 'Rotación programada',
    });

    expect(result!.movements).toHaveLength(1);
    const mov = result!.movements[0];
    expect(mov.herdId).toBe('herd-1');
    expect(mov.herdName).toBe('Lote 4a');
    expect(mov.fromPastureName).toBe('Lote 1');
    expect(mov.toPastureName).toBe('Lote 2');
    expect(mov.movedBy).toBe('Jose');
    expect(mov.notes).toBe('Rotación programada');
  });

  it('persists all changes to localStorage', () => {
    saveStoredFarm(makeFarm());

    moveHerd('herd-1', {
      toPastureId: 'pasture-2',
      movedAt: new Date(),
      movedBy: 'Ana',
    });

    const loaded = loadStoredFarm();
    expect(loaded!.herds[0].pastureId).toBe('pasture-2');
    expect(loaded!.movements).toHaveLength(1);
  });

  it('generates a unique movement id', () => {
    saveStoredFarm(makeFarm({
      herds: [
        { id: 'herd-1', name: 'Lote A', pastureId: 'pasture-1', cattleCount: 10, breed: 'Angus', status: 'active', entryDate: new Date('2026-01-01') as unknown as Date, coordinate: [-57, -23] },
        { id: 'herd-2', name: 'Lote B', pastureId: 'pasture-1', cattleCount: 10, breed: 'Angus', status: 'active', entryDate: new Date('2026-01-01') as unknown as Date, coordinate: [-57, -23] },
      ],
    }));

    moveHerd('herd-1', { toPastureId: 'pasture-2', movedAt: new Date(), movedBy: 'x' });
    moveHerd('herd-2', { toPastureId: 'pasture-2', movedAt: new Date(), movedBy: 'x' });

    const loaded = loadStoredFarm();
    const ids = loaded!.movements.map((m) => m.id);
    expect(ids[0]).not.toBe(ids[1]);
  });
});
