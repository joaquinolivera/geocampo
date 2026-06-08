/**
 * @jest-environment jsdom
 */
// TDD — removePasture()

import { loadStoredFarm, saveStoredFarm, removePasture, buildStoredFarm } from '../lib/farm-store';

const COORDS: [number, number][][] = [[
  [-58.42, -34.58], [-58.38, -34.58],
  [-58.38, -34.62], [-58.42, -34.62],
  [-58.42, -34.58],
]];

function seedFarm() {
  const farm = buildStoredFarm({
    name: 'Test Farm', ownerName: 'Tester',
    pastures: [
      { name: 'Potrero 1', areaHectares: 20, carryingCapacity: 20, coordinates: COORDS },
      { name: 'Potrero 2', areaHectares: 15, carryingCapacity: 15, coordinates: COORDS },
    ],
    herds: [
      { pastureId: 'pasture-1', name: 'Lote A', cattleCount: 10, breed: 'Hereford', entryDate: '2026-01-01' },
    ],
  });
  saveStoredFarm(farm);
  return farm;
}

beforeEach(() => localStorage.clear());

describe('removePasture()', () => {
  it('returns null when no farm is stored', () => {
    expect(removePasture('pasture-1')).toBeNull();
  });

  it('returns null when pastureId does not exist', () => {
    seedFarm();
    expect(removePasture('pasture-999')).toBeNull();
  });

  it('returns { error: "has_herd" } when a herd is assigned to the pasture', () => {
    seedFarm();
    const result = removePasture('pasture-1');
    expect(result).toEqual({ error: 'has_herd' });
  });

  it('does not remove the pasture when a herd is assigned', () => {
    seedFarm();
    removePasture('pasture-1');
    expect(loadStoredFarm()!.pastures).toHaveLength(2);
  });

  it('removes the pasture when no herd is assigned', () => {
    seedFarm();
    const result = removePasture('pasture-2');
    expect(result).not.toBeNull();
    expect((result as { farm: object }).farm).toBeDefined();
  });

  it('persists the removal to localStorage', () => {
    seedFarm();
    removePasture('pasture-2');
    expect(loadStoredFarm()!.pastures).toHaveLength(1);
    expect(loadStoredFarm()!.pastures[0].id).toBe('pasture-1');
  });

  it('updates totalAreaHectares after removal', () => {
    const farm = seedFarm();
    const originalArea = farm.totalAreaHectares;
    removePasture('pasture-2');
    const stored = loadStoredFarm();
    expect(stored!.totalAreaHectares).toBeLessThan(originalArea);
  });

  it('returns { farm } on successful removal', () => {
    seedFarm();
    const result = removePasture('pasture-2') as { farm: { pastures: unknown[] } };
    expect(result.farm.pastures).toHaveLength(1);
  });
});
