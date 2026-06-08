/**
 * @jest-environment jsdom
 *
 * Tests for Phase I ERP mutations: addEmployee, addFuelLog, addExpense, addMachine
 * and Phase B2b polygon-redraw extension to updatePasture().
 */

import {
  buildStoredFarm,
  saveStoredFarm,
  loadStoredFarm,
  addEmployee,
  addFuelLog,
  addExpense,
  addMachine,
  updatePasture,
} from '../lib/farm-store';

const COORDS: [number, number][][] = [[
  [-58.42, -34.58], [-58.38, -34.58],
  [-58.38, -34.62], [-58.42, -34.62],
  [-58.42, -34.58],
]];

const NEW_COORDS: [number, number][][] = [[
  [-58.50, -34.50], [-58.45, -34.50],
  [-58.45, -34.55], [-58.50, -34.55],
  [-58.50, -34.50],
]];

function seedFarm() {
  const farm = buildStoredFarm({
    name:      'Test Farm',
    ownerName: 'Tester',
    pastures: [
      { name: 'Potrero A', areaHectares: 20, carryingCapacity: 20, coordinates: COORDS },
    ],
    herds: [],
  });
  saveStoredFarm(farm);
  return farm;
}

beforeEach(() => localStorage.clear());

// ─── addEmployee ─────────────────────────────────────────────────────────────

describe('addEmployee()', () => {
  it('returns null when no farm is stored', () => {
    expect(addEmployee({ name: 'Juan' })).toBeNull();
  });

  it('creates an employee with required fields', () => {
    seedFarm();
    const emp = addEmployee({ name: 'María García' });
    expect(emp).not.toBeNull();
    expect(emp!.name).toBe('María García');
    expect(emp!.active).toBe(true);
    expect(emp!.id).toBeTruthy();
  });

  it('creates an employee with optional fields', () => {
    seedFarm();
    const emp = addEmployee({
      name:          'Carlos López',
      role:          'Peón de campo',
      phone:         '+595981234567',
      salaryMonthly: 1_500_000,
      idNumber:      '3.456.789',
    });
    expect(emp!.role).toBe('Peón de campo');
    expect(emp!.phone).toBe('+595981234567');
    expect(emp!.salaryMonthly).toBe(1_500_000);
    expect(emp!.idNumber).toBe('3.456.789');
  });

  it('sets null for omitted optional fields', () => {
    seedFarm();
    const emp = addEmployee({ name: 'Solo nombre' });
    expect(emp!.role).toBeNull();
    expect(emp!.phone).toBeNull();
    expect(emp!.salaryMonthly).toBeNull();
  });

  it('persists to localStorage', () => {
    seedFarm();
    addEmployee({ name: 'Persistido' });
    const stored = loadStoredFarm();
    expect(stored!.employees).toHaveLength(1);
    expect(stored!.employees![0].name).toBe('Persistido');
  });

  it('accumulates multiple employees', () => {
    seedFarm();
    addEmployee({ name: 'Emp 1' });
    addEmployee({ name: 'Emp 2' });
    addEmployee({ name: 'Emp 3' });
    const stored = loadStoredFarm();
    expect(stored!.employees).toHaveLength(3);
  });

  it('assigns a unique farmId', () => {
    const farm = seedFarm();
    const emp = addEmployee({ name: 'Test' });
    expect(emp!.farmId).toBe(farm.id);
  });
});

// ─── addFuelLog ───────────────────────────────────────────────────────────────

describe('addFuelLog()', () => {
  it('returns null when no farm is stored', () => {
    expect(addFuelLog({ date: new Date('2024-06-01'), liters: 100 })).toBeNull();
  });

  it('creates a fuel log with required fields', () => {
    seedFarm();
    const log = addFuelLog({ date: new Date('2024-06-01'), liters: 150 });
    expect(log).not.toBeNull();
    expect(log!.liters).toBe(150);
  });

  it('calculates totalCost from liters × costPerLiter', () => {
    seedFarm();
    const log = addFuelLog({ date: new Date('2024-06-01'), liters: 100, costPerLiter: 8_000 });
    expect(log!.totalCost).toBe(800_000);
  });

  it('sets totalCost to null when costPerLiter is omitted', () => {
    seedFarm();
    const log = addFuelLog({ date: new Date('2024-06-01'), liters: 50 });
    expect(log!.totalCost).toBeNull();
    expect(log!.costPerLiter).toBeNull();
  });

  it('stores optional vehicle and purpose', () => {
    seedFarm();
    const log = addFuelLog({
      date:             new Date('2024-06-01'),
      liters:           200,
      vehicleEquipment: 'Tractor John Deere 5090',
      purpose:          'Laboreo',
    });
    expect(log!.vehicleEquipment).toBe('Tractor John Deere 5090');
    expect(log!.purpose).toBe('Laboreo');
  });

  it('accumulates multiple logs', () => {
    seedFarm();
    addFuelLog({ date: new Date('2024-01-01'), liters: 100 });
    addFuelLog({ date: new Date('2024-02-01'), liters: 200 });
    const stored = loadStoredFarm();
    expect(stored!.fuelLogs).toHaveLength(2);
    expect(stored!.fuelLogs!.reduce((s, l) => s + l.liters, 0)).toBe(300);
  });
});

// ─── addExpense ───────────────────────────────────────────────────────────────

describe('addExpense()', () => {
  it('returns null when no farm is stored', () => {
    expect(addExpense({ date: new Date('2024-06-01'), category: 'veterinary', description: 'x', amount: 100 })).toBeNull();
  });

  it('creates an expense with all required fields', () => {
    seedFarm();
    const exp = addExpense({
      date:        new Date('2024-06-01'),
      category:    'veterinary',
      description: 'Vacuna aftosa',
      amount:      50_000,
    });
    expect(exp).not.toBeNull();
    expect(exp!.category).toBe('veterinary');
    expect(exp!.amount).toBe(50_000);
    expect(exp!.description).toBe('Vacuna aftosa');
  });

  it('stores optional supplier', () => {
    seedFarm();
    const exp = addExpense({
      date:        new Date('2024-06-01'),
      category:    'other',
      description: 'Bolsas',
      amount:      10_000,
      supplier:    'Agropecuaria Asunción',
    });
    expect(exp!.supplier).toBe('Agropecuaria Asunción');
  });

  it('sets receiptUrl to null by default', () => {
    seedFarm();
    const exp = addExpense({ date: new Date('2024-06-01'), category: 'other', description: 'Misc', amount: 1_000 });
    expect(exp!.receiptUrl).toBeNull();
  });

  it('accumulates expenses', () => {
    seedFarm();
    addExpense({ date: new Date('2024-01-01'), category: 'fuel',  description: 'a', amount: 100 });
    addExpense({ date: new Date('2024-02-01'), category: 'feed',  description: 'b', amount: 200 });
    addExpense({ date: new Date('2024-03-01'), category: 'labor', description: 'c', amount: 300 });
    expect(loadStoredFarm()!.expenses).toHaveLength(3);
  });
});

// ─── addMachine ───────────────────────────────────────────────────────────────

describe('addMachine()', () => {
  it('returns null when no farm is stored', () => {
    expect(addMachine({ name: 'Tractor', type: 'tractor', status: 'active', brand: null, model: null, year: null, purchaseDate: null, purchasePrice: null, notes: null })).toBeNull();
  });

  it('creates a machine with required fields', () => {
    seedFarm();
    const m = addMachine({ name: 'Tractor 5090', type: 'tractor', status: 'active', brand: null, model: null, year: null, purchaseDate: null, purchasePrice: null, notes: null });
    expect(m).not.toBeNull();
    expect(m!.name).toBe('Tractor 5090');
    expect(m!.type).toBe('tractor');
    expect(m!.status).toBe('active');
    expect(m!.id).toBeTruthy();
  });

  it('stores optional brand, model, year', () => {
    seedFarm();
    const m = addMachine({
      name:          'John Deere 5090E',
      type:          'tractor',
      status:        'active',
      brand:         'John Deere',
      model:         '5090E',
      year:          2021,
      purchaseDate:  null,
      purchasePrice: null,
      notes:         null,
    });
    expect(m!.brand).toBe('John Deere');
    expect(m!.model).toBe('5090E');
    expect(m!.year).toBe(2021);
  });

  it('persists to localStorage', () => {
    seedFarm();
    addMachine({ name: 'Cosechadora', type: 'harvester', status: 'active', brand: null, model: null, year: null, purchaseDate: null, purchasePrice: null, notes: null });
    expect(loadStoredFarm()!.machinery).toHaveLength(1);
  });

  it('accumulates machinery', () => {
    seedFarm();
    addMachine({ name: 'Tractor A', type: 'tractor', status: 'active',      brand: null, model: null, year: null, purchaseDate: null, purchasePrice: null, notes: null });
    addMachine({ name: 'Tractor B', type: 'tractor', status: 'maintenance', brand: null, model: null, year: null, purchaseDate: null, purchasePrice: null, notes: null });
    addMachine({ name: 'Pulverizadora', type: 'sprayer', status: 'active',   brand: null, model: null, year: null, purchaseDate: null, purchasePrice: null, notes: null });
    expect(loadStoredFarm()!.machinery).toHaveLength(3);
  });
});

// ─── updatePasture() with coordinates (Phase B2b) ────────────────────────────

describe('updatePasture() — polygon redraw', () => {
  it('updates the geometry when coordinates are provided', () => {
    const farm = seedFarm();
    const pastureId = farm.pastures[0].id;
    const result = updatePasture(pastureId, { coordinates: NEW_COORDS });
    const updated = result!.pastures.find(p => p.id === pastureId)!;
    expect(updated.geometry.coordinates).toEqual(NEW_COORDS);
  });

  it('recalculates areaHectares after redraw', () => {
    const farm = seedFarm();
    const pastureId = farm.pastures[0].id;
    updatePasture(pastureId, { coordinates: NEW_COORDS });
    const after = loadStoredFarm()!.pastures.find(p => p.id === pastureId)!.areaHectares;
    expect(after).toBeGreaterThan(0);
    expect(typeof after).toBe('number');
    expect(isNaN(after)).toBe(false);
  });

  it('leaves geometry untouched when coordinates are not provided', () => {
    const farm = seedFarm();
    const pastureId = farm.pastures[0].id;
    const originalCoords = farm.pastures[0].geometry.coordinates;
    updatePasture(pastureId, { name: 'Solo nombre cambiado' });
    const after = loadStoredFarm()!.pastures.find(p => p.id === pastureId)!;
    expect(after.geometry.coordinates).toEqual(originalCoords);
    expect(after.name).toBe('Solo nombre cambiado');
  });

  it('can update both name and coordinates in one call', () => {
    const farm = seedFarm();
    const pastureId = farm.pastures[0].id;
    updatePasture(pastureId, { name: 'Redibujo total', coordinates: NEW_COORDS });
    const updated = loadStoredFarm()!.pastures.find(p => p.id === pastureId)!;
    expect(updated.name).toBe('Redibujo total');
    expect(updated.geometry.coordinates).toEqual(NEW_COORDS);
  });

  it('persists the new geometry to localStorage', () => {
    const farm = seedFarm();
    const pastureId = farm.pastures[0].id;
    updatePasture(pastureId, { coordinates: NEW_COORDS });
    const stored = loadStoredFarm();
    const saved = stored!.pastures.find(p => p.id === pastureId)!;
    expect(saved.geometry.coordinates).toEqual(NEW_COORDS);
  });
});
