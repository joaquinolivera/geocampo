/**
 * @fileoverview Phase G — Individual cattle / DIOB chip tracking tests
 * @jest-environment jsdom
 */

import {
  loadStoredFarm,
  saveStoredFarm,
  listCattle,
  addCattle,
  updateCattle,
  removeCattle,
  getCattleByChip,
  type StoredCattle,
} from '../lib/farm-store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FARM_ID  = 'f-test-01';
const HERD_ID  = 'h-test-01';
const HERD_ID2 = 'h-test-02';

function seedFarm() {
  const farm = {
    id:                FARM_ID,
    name:              'Test Farm',
    ownerName:         'Juan',
    totalAreaHectares: 100,
    location:          [-58.5, -25.3] as [number, number],
    pastures:          [],
    herds:             [],
    infrastructure:    [],
    movements:         [],
    healthRecords:     [],
    weightRecords:     [],
    cattle:            [] as StoredCattle[],
    createdAt:         new Date().toISOString(),
    updatedAt:         new Date().toISOString(),
  };
  saveStoredFarm(farm);
  return farm;
}

beforeEach(() => {
  localStorage.clear();
  seedFarm();
});

afterEach(() => {
  localStorage.clear();
});

// ─── listCattle ───────────────────────────────────────────────────────────────

describe('listCattle', () => {
  it('returns empty array when no cattle', () => {
    expect(listCattle()).toEqual([]);
  });

  it('returns all cattle when no herdId filter', () => {
    addCattle({ herdId: HERD_ID,  chipId: '982000100000001' });
    addCattle({ herdId: HERD_ID2, chipId: '982000100000002' });
    expect(listCattle()).toHaveLength(2);
  });

  it('filters by herdId', () => {
    addCattle({ herdId: HERD_ID,  chipId: '982000100000001' });
    addCattle({ herdId: HERD_ID2, chipId: '982000100000002' });
    const result = listCattle(HERD_ID);
    expect(result).toHaveLength(1);
    expect(result[0].herdId).toBe(HERD_ID);
  });

  it('returns [] when farm not found', () => {
    localStorage.clear();
    expect(listCattle()).toEqual([]);
  });
});

// ─── addCattle ────────────────────────────────────────────────────────────────

describe('addCattle', () => {
  it('creates an animal with required fields', () => {
    const animal = addCattle({ herdId: HERD_ID, chipId: '982000100000001' });
    expect(animal).not.toBeNull();
    expect(animal!.herdId).toBe(HERD_ID);
    expect(animal!.chipId).toBe('982000100000001');
    expect(animal!.status).toBe('active');
    expect(animal!.id).toBeTruthy();
    expect(animal!.farmId).toBe(FARM_ID);
  });

  it('stores all optional fields', () => {
    const dob = new Date('2022-03-15');
    const animal = addCattle({
      herdId:      HERD_ID,
      chipId:      '982000100000003',
      visualTagId: 'A-042',
      sex:         'female',
      breed:       'Nelore',
      dob,
      notes:       'ternera mansa',
    });
    expect(animal!.visualTagId).toBe('A-042');
    expect(animal!.sex).toBe('female');
    expect(animal!.breed).toBe('Nelore');
    expect(animal!.dob).toBe('2022-03-15');
    expect(animal!.notes).toBe('ternera mansa');
  });

  it('persists to localStorage', () => {
    addCattle({ herdId: HERD_ID, chipId: '982000100000004' });
    const farm = loadStoredFarm();
    expect(farm!.cattle).toHaveLength(1);
  });

  it('allows cattle without a chip (visual tag only)', () => {
    const animal = addCattle({ herdId: HERD_ID, visualTagId: 'B-999' });
    expect(animal).not.toBeNull();
    expect(animal!.chipId).toBeNull();
    expect(animal!.visualTagId).toBe('B-999');
  });

  it('throws on duplicate chipId in same farm', () => {
    addCattle({ herdId: HERD_ID, chipId: '982000100000005' });
    expect(() => addCattle({ herdId: HERD_ID2, chipId: '982000100000005' }))
      .toThrow(/registrado/i);
  });

  it('returns null when no farm in localStorage', () => {
    localStorage.clear();
    expect(addCattle({ herdId: HERD_ID, chipId: '982000100000006' })).toBeNull();
  });
});

// ─── updateCattle ─────────────────────────────────────────────────────────────

describe('updateCattle', () => {
  it('updates status to sold', () => {
    const animal = addCattle({ herdId: HERD_ID, chipId: '982000100000010' })!;
    const updated = updateCattle(animal.id, { status: 'sold' });
    expect(updated!.status).toBe('sold');
  });

  it('updates multiple fields at once', () => {
    const animal = addCattle({ herdId: HERD_ID, visualTagId: 'C-001' })!;
    const updated = updateCattle(animal.id, {
      breed:       'Brangus',
      sex:         'male',
      visualTagId: 'C-002',
    });
    expect(updated!.breed).toBe('Brangus');
    expect(updated!.sex).toBe('male');
    expect(updated!.visualTagId).toBe('C-002');
  });

  it('returns null for unknown id', () => {
    expect(updateCattle('nonexistent-id', { status: 'sold' })).toBeNull();
  });

  it('throws on duplicate chipId when changing to existing chip', () => {
    const a1 = addCattle({ herdId: HERD_ID, chipId: '982000100000011' })!;
    addCattle({ herdId: HERD_ID, chipId: '982000100000012' });
    expect(() => updateCattle(a1.id, { chipId: '982000100000012' }))
      .toThrow(/registrado/i);
  });

  it('allows updating chipId to a new unique value', () => {
    const animal = addCattle({ herdId: HERD_ID, chipId: '982000100000013' })!;
    const updated = updateCattle(animal.id, { chipId: '982000100000099' });
    expect(updated!.chipId).toBe('982000100000099');
  });

  it('preserves unmodified fields', () => {
    const animal = addCattle({ herdId: HERD_ID, chipId: '982000100000014', breed: 'Nelore' })!;
    const updated = updateCattle(animal.id, { status: 'transferred' });
    expect(updated!.breed).toBe('Nelore');
    expect(updated!.chipId).toBe('982000100000014');
  });

  it('sets updatedAt to a new timestamp', async () => {
    const animal = addCattle({ herdId: HERD_ID, visualTagId: 'D-001' })!;
    await new Promise((r) => setTimeout(r, 5));
    const updated = updateCattle(animal.id, { status: 'deceased' })!;
    expect(updated.updatedAt > animal.updatedAt).toBe(true);
  });
});

// ─── removeCattle ─────────────────────────────────────────────────────────────

describe('removeCattle', () => {
  it('removes an existing animal', () => {
    const animal = addCattle({ herdId: HERD_ID, chipId: '982000100000020' })!;
    const ok = removeCattle(animal.id);
    expect(ok).toBe(true);
    expect(listCattle()).toHaveLength(0);
  });

  it('returns false for unknown id', () => {
    expect(removeCattle('ghost-id')).toBe(false);
  });

  it('does not affect other animals', () => {
    const a1 = addCattle({ herdId: HERD_ID, chipId: '982000100000021' })!;
    const a2 = addCattle({ herdId: HERD_ID, chipId: '982000100000022' })!;
    removeCattle(a1.id);
    expect(listCattle()).toHaveLength(1);
    expect(listCattle()[0].id).toBe(a2.id);
  });
});

// ─── getCattleByChip ──────────────────────────────────────────────────────────

describe('getCattleByChip', () => {
  it('finds an animal by chip ID', () => {
    addCattle({ herdId: HERD_ID, chipId: '982000100000030' });
    const found = getCattleByChip('982000100000030');
    expect(found).not.toBeNull();
    expect(found!.chipId).toBe('982000100000030');
  });

  it('returns null when chip not found', () => {
    expect(getCattleByChip('999999999999999')).toBeNull();
  });

  it('returns null when no farm', () => {
    localStorage.clear();
    expect(getCattleByChip('982000100000030')).toBeNull();
  });
});

// ─── SINIP CSV format ─────────────────────────────────────────────────────────

describe('SINIP CSV generation (client-side)', () => {
  it('generates valid CSV row data from cattle records', () => {
    addCattle({
      herdId:      HERD_ID,
      chipId:      '982000123456789',
      visualTagId: 'A-101',
      sex:         'female',
      breed:       'Nelore',
      dob:         new Date('2021-06-01'),
    });

    const cattle = listCattle();
    expect(cattle).toHaveLength(1);

    const row = cattle[0];
    // Verify all SINIP-required fields are present
    expect(row.chipId).toBe('982000123456789');
    expect(row.visualTagId).toBe('A-101');
    expect(row.sex).toBe('female');
    expect(row.breed).toBe('Nelore');
    expect(row.dob).toBe('2021-06-01');
    expect(row.status).toBe('active');

    // Verify ISO 11784 chip format (15 digits)
    const chipDigits = row.chipId!.replace(/\D/g, '');
    expect(chipDigits).toHaveLength(15);
  });

  it('handles animals without chip (visual tag only)', () => {
    addCattle({ herdId: HERD_ID, visualTagId: 'B-202' });
    const cattle = listCattle();
    expect(cattle[0].chipId).toBeNull();
    expect(cattle[0].visualTagId).toBe('B-202');
  });
});
