/**
 * @fileoverview TDD tests for addHealthRecord() in farm-store.ts
 */

import {
  addHealthRecord,
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

beforeEach(() => localStorageMock.clear());

describe('addHealthRecord()', () => {
  it('returns null when no farm is stored', () => {
    const result = addHealthRecord('herd-1', {
      treatmentType: 'vaccination',
      administeredAt: new Date('2026-06-08'),
      administeredBy: 'Dr. García',
    });
    expect(result).toBeNull();
  });

  it('appends a HealthRecord and returns updated farm', () => {
    saveStoredFarm(makeFarm());

    const result = addHealthRecord('herd-1', {
      treatmentType: 'vaccination',
      productName: 'Aftosa Triple',
      dosage: '2ml IM',
      administeredAt: new Date('2026-06-08'),
      administeredBy: 'Dr. García',
      nextDueDate: new Date('2026-12-08'),
      notes: 'Vacuna obligatoria',
    });

    expect(result).not.toBeNull();
    expect(result!.healthRecords).toHaveLength(1);
    const rec = result!.healthRecords[0];
    expect(rec.herdId).toBe('herd-1');
    expect(rec.treatmentType).toBe('vaccination');
    expect(rec.productName).toBe('Aftosa Triple');
    expect(rec.dosage).toBe('2ml IM');
    expect(rec.administeredBy).toBe('Dr. García');
    expect(rec.notes).toBe('Vacuna obligatoria');
  });

  it('persists to localStorage', () => {
    saveStoredFarm(makeFarm());

    addHealthRecord('herd-1', {
      treatmentType: 'deworming',
      administeredAt: new Date('2026-06-08'),
      administeredBy: 'Jose',
    });

    const loaded = loadStoredFarm();
    expect(loaded!.healthRecords).toHaveLength(1);
    expect(loaded!.healthRecords[0].treatmentType).toBe('deworming');
  });

  it('generates a unique id for each record', () => {
    saveStoredFarm(makeFarm());

    addHealthRecord('herd-1', { treatmentType: 'checkup', administeredAt: new Date(), administeredBy: 'x' });
    addHealthRecord('herd-1', { treatmentType: 'treatment', administeredAt: new Date(), administeredBy: 'x' });

    const loaded = loadStoredFarm();
    const ids = loaded!.healthRecords.map((r) => r.id);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('sets nullable fields to null when not provided', () => {
    saveStoredFarm(makeFarm());

    const result = addHealthRecord('herd-1', {
      treatmentType: 'checkup',
      administeredAt: new Date(),
      administeredBy: 'Jose',
    });

    const rec = result!.healthRecords[0];
    expect(rec.productName).toBeNull();
    expect(rec.dosage).toBeNull();
    expect(rec.nextDueDate).toBeNull();
    expect(rec.notes).toBeNull();
  });

  it('appends without overwriting existing records', () => {
    saveStoredFarm(makeFarm({
      healthRecords: [{
        id: 'h-existing',
        herdId: 'herd-1',
        treatmentType: 'vaccination',
        productName: null,
        dosage: null,
        administeredBy: 'Old',
        administeredAt: new Date('2026-01-01') as unknown as Date,
        nextDueDate: null,
        notes: null,
      }],
    }));

    const result = addHealthRecord('herd-1', {
      treatmentType: 'deworming',
      administeredAt: new Date(),
      administeredBy: 'New',
    });

    expect(result!.healthRecords).toHaveLength(2);
    expect(result!.healthRecords[0].id).toBe('h-existing');
  });
});
