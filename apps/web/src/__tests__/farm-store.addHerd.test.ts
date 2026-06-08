/**
 * @jest-environment jsdom
 */
// TDD — addHerd()

import { loadStoredFarm, saveStoredFarm, addHerd, buildStoredFarm } from '../lib/farm-store';
import type { AddHerdInput } from '../lib/farm-store';

const PASTURE_COORDS: [number, number][][] = [
  [
    [-58.42, -34.58],
    [-58.38, -34.58],
    [-58.38, -34.62],
    [-58.42, -34.62],
    [-58.42, -34.58],
  ],
];

function seedFarm() {
  const farm = buildStoredFarm({
    name: 'Test Farm',
    ownerName: 'Tester',
    pastures: [
      { name: 'Potrero 1', areaHectares: 20, carryingCapacity: 20, coordinates: PASTURE_COORDS },
    ],
    herds: [],
  });
  saveStoredFarm(farm);
  return farm;
}

beforeEach(() => {
  localStorage.clear();
});

const VALID_INPUT: AddHerdInput = {
  pastureId: 'pasture-1',
  name: 'Vacas Norte',
  cattleCount: 15,
  breed: 'Hereford',
  species: 'bovino',
  entryDate: new Date('2026-06-01'),
};

describe('addHerd()', () => {
  it('returns null when no farm is stored', () => {
    expect(addHerd(VALID_INPUT)).toBeNull();
  });

  it('returns null when pastureId does not exist', () => {
    seedFarm();
    expect(addHerd({ ...VALID_INPUT, pastureId: 'pasture-999' })).toBeNull();
  });

  it('appends the new herd to the farm', () => {
    seedFarm();
    const result = addHerd(VALID_INPUT);
    expect(result).not.toBeNull();
    expect(result!.herds).toHaveLength(1);
  });

  it('persists the new herd to localStorage', () => {
    seedFarm();
    addHerd(VALID_INPUT);
    const stored = loadStoredFarm();
    expect(stored!.herds).toHaveLength(1);
  });

  it('assigns a unique id', () => {
    seedFarm();
    addHerd(VALID_INPUT);
    addHerd({ ...VALID_INPUT, name: 'Lote 2' });
    const stored = loadStoredFarm();
    const ids = stored!.herds.map((h) => h.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('sets coordinate to pasture centroid', () => {
    seedFarm();
    const result = addHerd(VALID_INPUT);
    const herd = result!.herds[0];
    // centroid of the square: avg lon = -58.40, avg lat = -34.60
    expect(herd.coordinate[0]).toBeCloseTo(-58.40, 1);
    expect(herd.coordinate[1]).toBeCloseTo(-34.60, 1);
  });

  it('stores the correct pastureId, name, breed, cattleCount, species', () => {
    seedFarm();
    const result = addHerd(VALID_INPUT);
    const herd = result!.herds[0];
    expect(herd.pastureId).toBe('pasture-1');
    expect(herd.name).toBe('Vacas Norte');
    expect(herd.breed).toBe('Hereford');
    expect(herd.cattleCount).toBe(15);
    expect(herd.species).toBe('bovino');
  });

  it('accepts ovino species', () => {
    seedFarm();
    const result = addHerd({ ...VALID_INPUT, species: 'ovino', breed: 'Merino', name: 'Ovejas Lote A' });
    expect(result!.herds[0].species).toBe('ovino');
  });

  it('sets status to active', () => {
    seedFarm();
    const result = addHerd(VALID_INPUT);
    expect(result!.herds[0].status).toBe('active');
  });

  it('stores entryDate', () => {
    seedFarm();
    const result = addHerd(VALID_INPUT);
    const herd = result!.herds[0];
    const entry = herd.entryDate instanceof Date ? herd.entryDate : new Date(herd.entryDate as string);
    expect(entry.toISOString().slice(0, 10)).toBe('2026-06-01');
  });
});
