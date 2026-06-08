/**
 * @jest-environment jsdom
 */
// TDD — updatePasture()

import { loadStoredFarm, saveStoredFarm, updatePasture, buildStoredFarm } from '../lib/farm-store';
import type { UpdatePastureInput } from '../lib/farm-store';

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
    herds: [],
  });
  saveStoredFarm(farm);
  return farm;
}

beforeEach(() => localStorage.clear());

describe('updatePasture()', () => {
  it('returns null when no farm is stored', () => {
    expect(updatePasture('pasture-1', { name: 'Nuevo' })).toBeNull();
  });

  it('returns null when pastureId does not exist', () => {
    seedFarm();
    expect(updatePasture('pasture-999', { name: 'X' })).toBeNull();
  });

  it('updates the pasture name', () => {
    seedFarm();
    const result = updatePasture('pasture-1', { name: 'Potrero Nuevo' });
    const updated = result!.pastures.find(p => p.id === 'pasture-1');
    expect(updated!.name).toBe('Potrero Nuevo');
  });

  it('updates carryingCapacity', () => {
    seedFarm();
    const result = updatePasture('pasture-1', { carryingCapacity: 99 });
    expect(result!.pastures.find(p => p.id === 'pasture-1')!.carryingCapacity).toBe(99);
  });

  it('updates grassType', () => {
    seedFarm();
    const result = updatePasture('pasture-1', { grassType: 'alfalfa' });
    expect(result!.pastures.find(p => p.id === 'pasture-1')!.grassType).toBe('alfalfa');
  });

  it('updates waterSupply', () => {
    seedFarm();
    const result = updatePasture('pasture-1', { waterSupply: 'molino' });
    expect(result!.pastures.find(p => p.id === 'pasture-1')!.waterSupply).toBe('molino');
  });

  it('updates notes', () => {
    seedFarm();
    const result = updatePasture('pasture-1', { notes: 'Revisión pendiente' });
    expect(result!.pastures.find(p => p.id === 'pasture-1')!.notes).toBe('Revisión pendiente');
  });

  it('does not affect other pastures', () => {
    seedFarm();
    updatePasture('pasture-1', { name: 'Cambiado' });
    const stored = loadStoredFarm();
    expect(stored!.pastures.find(p => p.id === 'pasture-2')!.name).toBe('Potrero 2');
  });

  it('only updates provided fields (partial update)', () => {
    const farm = seedFarm();
    const original = farm.pastures.find(p => p.id === 'pasture-1')!;
    updatePasture('pasture-1', { name: 'Solo nombre' });
    const stored = loadStoredFarm();
    const updated = stored!.pastures.find(p => p.id === 'pasture-1')!;
    expect(updated.carryingCapacity).toBe(original.carryingCapacity);
    expect(updated.areaHectares).toBe(original.areaHectares);
  });

  it('persists changes to localStorage', () => {
    seedFarm();
    updatePasture('pasture-1', { name: 'Guardado' });
    expect(loadStoredFarm()!.pastures.find(p => p.id === 'pasture-1')!.name).toBe('Guardado');
  });
});
