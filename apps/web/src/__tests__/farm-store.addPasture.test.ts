/**
 * @jest-environment jsdom
 */
// TDD — addPasture()
// RED first: run these before implementing addPasture in farm-store.ts.

import { loadStoredFarm, saveStoredFarm, addPasture, buildStoredFarm } from '../lib/farm-store';
import type { AddPastureInput } from '../lib/farm-store';

// ─── Minimal farm fixture ──────────────────────────────────────────────────────

const FARM_COORDS: [number, number][][] = [
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
      {
        name: 'Potrero 1',
        areaHectares: 20,
        carryingCapacity: 20,
        coordinates: FARM_COORDS,
      },
    ],
    herds: [],
  });
  saveStoredFarm(farm);
  return farm;
}

beforeEach(() => {
  localStorage.clear();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('addPasture()', () => {
  it('returns null when no farm is stored', () => {
    const result = addPasture({ name: 'P', carryingCapacity: 10, coordinates: FARM_COORDS });
    expect(result).toBeNull();
  });

  it('appends a new pasture to the farm', () => {
    seedFarm();
    const result = addPasture({ name: 'Potrero Nuevo', carryingCapacity: 15, coordinates: FARM_COORDS });
    expect(result).not.toBeNull();
    expect(result!.pastures).toHaveLength(2);
  });

  it('persists the new pasture to localStorage', () => {
    seedFarm();
    addPasture({ name: 'Potrero Nuevo', carryingCapacity: 15, coordinates: FARM_COORDS });
    const stored = loadStoredFarm();
    expect(stored!.pastures).toHaveLength(2);
  });

  it('assigns a unique id to the new pasture', () => {
    seedFarm();
    addPasture({ name: 'A', carryingCapacity: 5, coordinates: FARM_COORDS });
    addPasture({ name: 'B', carryingCapacity: 5, coordinates: FARM_COORDS });
    const stored = loadStoredFarm();
    const ids = stored!.pastures.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length); // all unique
  });

  it('calculates areaHectares from polygon coordinates', () => {
    seedFarm();
    const result = addPasture({ name: 'P', carryingCapacity: 10, coordinates: FARM_COORDS });
    const newPasture = result!.pastures.find((p) => p.name === 'P');
    expect(newPasture!.areaHectares).toBeGreaterThan(0);
  });

  it('stores the polygon geometry on the new pasture', () => {
    seedFarm();
    const result = addPasture({ name: 'P', carryingCapacity: 10, coordinates: FARM_COORDS });
    const newPasture = result!.pastures.find((p) => p.name === 'P');
    expect(newPasture!.geometry.type).toBe('Polygon');
    expect(newPasture!.geometry.coordinates).toEqual(FARM_COORDS);
  });

  it('accepts optional grassType and notes', () => {
    seedFarm();
    const result = addPasture({
      name: 'P',
      carryingCapacity: 10,
      coordinates: FARM_COORDS,
      grassType: 'ryegrass',
      notes: 'Test note',
    });
    const newPasture = result!.pastures.find((p) => p.name === 'P');
    expect(newPasture!.grassType).toBe('ryegrass');
    expect(newPasture!.notes).toBe('Test note');
  });

  it('updates totalAreaHectares on the farm', () => {
    const original = seedFarm();
    const originalArea = original.totalAreaHectares;
    const result = addPasture({ name: 'P', carryingCapacity: 10, coordinates: FARM_COORDS });
    expect(result!.totalAreaHectares).toBeGreaterThan(originalArea);
  });

  it('assigns a default color if none supplied', () => {
    seedFarm();
    const result = addPasture({ name: 'P', carryingCapacity: 10, coordinates: FARM_COORDS });
    const newPasture = result!.pastures.find((p) => p.name === 'P');
    expect(newPasture!.color).toBeTruthy();
  });
});
