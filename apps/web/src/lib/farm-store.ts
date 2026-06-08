/**
 * @fileoverview Persistent farm data store (localStorage).
 *
 * Field workers enter their real farm data via /setup.
 * It's saved here and the dashboard reads it instead of demo data.
 *
 * Shape mirrors data.ts types so the rest of the app is unaffected.
 */

import type { Pasture, Herd, HerdSpecies, InfrastructureFeature, Movement, HealthRecord, WeightRecord, GrassType, WaterSupplyType } from './data';
import type { Employee, AddEmployeeInput } from './db/employees';
import type { FuelLog, AddFuelLogInput } from './db/fuel';
import type { Expense, AddExpenseInput } from './db/expenses';
import type { Machine } from './db/machinery';

const STORE_KEY = 'geocampo_farm_v1';

// ─── Stored shape ─────────────────────────────────────────────────────────────

export interface StoredFarm {
  id: string;
  name: string;
  ownerName: string;
  totalAreaHectares: number;
  location: [number, number];
  pastures: Pasture[];
  herds: Herd[];
  infrastructure: InfrastructureFeature[];
  movements: Movement[];
  healthRecords: HealthRecord[];
  weightRecords: WeightRecord[];
  // Phase I — ERP (optional so old stored data stays compatible)
  employees?:   Employee[];
  fuelLogs?:    FuelLog[];
  expenses?:    Expense[];
  machinery?:   Machine[];
  createdAt: string;
  updatedAt: string;
}

// ─── Load / save ──────────────────────────────────────────────────────────────

export function loadStoredFarm(): StoredFarm | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredFarm;
  } catch {
    return null;
  }
}

export function saveStoredFarm(farm: StoredFarm): void {
  if (typeof window === 'undefined') return;
  farm.updatedAt = new Date().toISOString();
  localStorage.setItem(STORE_KEY, JSON.stringify(farm));
}

export function clearStoredFarm(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORE_KEY);
}

export function hasStoredFarm(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(STORE_KEY);
}

// ─── Polygon generator ────────────────────────────────────────────────────────
// Creates a square polygon centred on [lon, lat] sized to fit `areaHa` hectares.

export function generatePolygon(
  center: [number, number],
  areaHa: number,
): { type: 'Polygon'; coordinates: [number, number][][] } {
  const [lon, lat] = center;
  // 1 degree lat ≈ 111 km; 1 degree lon ≈ 111 km × cos(lat)
  const metersPerDegLat = 111_000;
  const metersPerDegLon = 111_000 * Math.cos((lat * Math.PI) / 180);

  // Side of the square in metres → degrees
  const sideMeter = Math.sqrt(areaHa * 10_000);
  const dLat = sideMeter / metersPerDegLat / 2;
  const dLon = sideMeter / metersPerDegLon / 2;

  return {
    type: 'Polygon',
    coordinates: [
      [
        [lon - dLon, lat + dLat],
        [lon + dLon, lat + dLat],
        [lon + dLon, lat - dLat],
        [lon - dLon, lat - dLat],
        [lon - dLon, lat + dLat], // close ring
      ],
    ],
  };
}

// ─── Builder helpers ──────────────────────────────────────────────────────────

export interface PastureInput {
  name: string;
  areaHectares: number;
  carryingCapacity: number;
  // Geometry: either a clicked center point (auto-generates square) OR real polygon coords from GeoJSON
  center?: [number, number];
  coordinates?: [number, number][][]; // real polygon ring(s) from GeoJSON
  // Enriched metadata
  grassType?: GrassType;
  waterSupply?: WaterSupplyType;
  elevationM?: number;
  notes?: string;
}

export interface HerdInput {
  pastureId: string;
  name: string;
  cattleCount: number;
  breed: string;
  entryDate: string; // ISO
}

export interface FarmInput {
  name: string;
  ownerName: string;
  pastures: PastureInput[];
  herds: HerdInput[];
}

/** Calculate polygon centroid (average of first ring vertices) */
export function polygonCentroid(coords: [number, number][][]): [number, number] {
  const ring = coords[0];
  const lon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
  const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
  return [lon, lat];
}

/** Estimate polygon area in hectares from lat/lon coordinates */
export function polygonAreaHectares(coords: [number, number][][]): number {
  const ring = coords[0];
  if (ring.length < 3) return 0;
  // Shoelace formula in degrees → convert to m²
  let area = 0;
  const R = 6_371_000; // Earth radius in metres
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    area += ((lon2 - lon1) * Math.PI) / 180 * (2 + Math.sin(phi1) + Math.sin(phi2));
  }
  const areaSqM = Math.abs((area * R * R) / 2);
  return areaSqM / 10_000; // m² → hectares
}

// ─── Update pasture mutation ──────────────────────────────────────────────────

export interface UpdatePastureInput {
  name?: string;
  carryingCapacity?: number;
  grassType?: GrassType;
  waterSupply?: WaterSupplyType;
  notes?: string;
  /** Replace the polygon boundary (closed ring array from drawing mode) */
  coordinates?: [number, number][][];
}

/**
 * Partially update a pasture's metadata and/or geometry.
 * Returns the updated StoredFarm, or null if farm/pasture not found.
 */
export function updatePasture(
  pastureId: string,
  input: UpdatePastureInput,
): StoredFarm | null {
  const farm = loadStoredFarm();
  if (!farm) return null;

  const idx = farm.pastures.findIndex((p) => p.id === pastureId);
  if (idx === -1) return null;

  farm.pastures = farm.pastures.map((p) => {
    if (p.id !== pastureId) return p;
    const newCoords = input.coordinates ?? (p.geometry?.coordinates as [number, number][][] | undefined);
    return {
      ...p,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.carryingCapacity !== undefined && { carryingCapacity: input.carryingCapacity }),
      ...(input.grassType !== undefined && { grassType: input.grassType }),
      ...(input.waterSupply !== undefined && { waterSupply: input.waterSupply }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.coordinates !== undefined && {
        geometry: { type: 'Polygon' as const, coordinates: input.coordinates },
        areaHectares: polygonAreaHectares(input.coordinates),
      }),
      ...(newCoords === undefined && {}),
    };
  });

  saveStoredFarm(farm);
  return farm;
}

// ─── Remove pasture mutation ──────────────────────────────────────────────────

export type RemovePastureResult =
  | { farm: StoredFarm }
  | { error: 'has_herd' }
  | null;

/**
 * Remove a pasture from the farm.
 * Returns { error: 'has_herd' } if a herd is currently assigned to it.
 * Returns null if farm or pasture not found.
 * Returns { farm } on success.
 */
export function removePasture(pastureId: string): RemovePastureResult {
  const farm = loadStoredFarm();
  if (!farm) return null;

  const pasture = farm.pastures.find((p) => p.id === pastureId);
  if (!pasture) return null;

  const hasHerd = farm.herds.some((h) => h.pastureId === pastureId);
  if (hasHerd) return { error: 'has_herd' };

  farm.pastures = farm.pastures.filter((p) => p.id !== pastureId);
  farm.totalAreaHectares = farm.pastures.reduce((s, p) => s + p.areaHectares, 0);
  saveStoredFarm(farm);
  return { farm };
}

// ─── Weight record mutation ───────────────────────────────────────────────────

export interface WeightEntryInput {
  cattleCount: number;
  averageWeightKg: number;
  weighedAt: Date;
  weighedBy: string;
  notes?: string;
}

/**
 * Append a new WeightRecord to the stored farm and persist to localStorage.
 * Returns the updated StoredFarm, or null if no farm is stored yet.
 */
export function addWeightRecord(
  herdId: string,
  entry: WeightEntryInput,
): StoredFarm | null {
  const farm = loadStoredFarm();
  if (!farm) return null;

  const record = {
    id: `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    herdId,
    weightKg: entry.cattleCount * entry.averageWeightKg,
    cattleCount: entry.cattleCount,
    averageWeightKg: entry.averageWeightKg,
    weighedAt: entry.weighedAt,
    weighedBy: entry.weighedBy,
    notes: entry.notes ?? null,
  };

  farm.weightRecords = [...farm.weightRecords, record];
  saveStoredFarm(farm);
  return farm;
}

// ─── Health record mutation ───────────────────────────────────────────────────

export interface HealthEntryInput {
  treatmentType: 'vaccination' | 'deworming' | 'treatment' | 'checkup';
  productName?: string;
  dosage?: string;
  administeredBy: string;
  administeredAt: Date;
  nextDueDate?: Date;
  notes?: string;
}

/**
 * Append a new HealthRecord to the stored farm and persist to localStorage.
 * Returns the updated StoredFarm, or null if no farm is stored yet.
 */
export function addHealthRecord(
  herdId: string,
  entry: HealthEntryInput,
): StoredFarm | null {
  const farm = loadStoredFarm();
  if (!farm) return null;

  const record = {
    id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    herdId,
    treatmentType: entry.treatmentType,
    productName: entry.productName ?? null,
    dosage: entry.dosage ?? null,
    administeredBy: entry.administeredBy,
    administeredAt: entry.administeredAt,
    nextDueDate: entry.nextDueDate ?? null,
    notes: entry.notes ?? null,
  };

  farm.healthRecords = [...farm.healthRecords, record];
  saveStoredFarm(farm);
  return farm;
}

// ─── Herd movement mutation ───────────────────────────────────────────────────

export interface MoveHerdInput {
  toPastureId: string;
  movedAt: Date;
  movedBy: string;
  notes?: string;
}

/**
 * Move a herd to a different pasture.
 * Updates herd.pastureId, herd.entryDate, herd.coordinate, and appends a Movement.
 * Returns the updated StoredFarm, or null if the farm/herd is not found.
 */
export function moveHerd(
  herdId: string,
  entry: MoveHerdInput,
): StoredFarm | null {
  const farm = loadStoredFarm();
  if (!farm) return null;

  const herdIdx = farm.herds.findIndex((h) => h.id === herdId);
  if (herdIdx === -1) return null;

  const herd = farm.herds[herdIdx];
  const fromPasture = farm.pastures.find((p) => p.id === herd.pastureId);
  const toPasture = farm.pastures.find((p) => p.id === entry.toPastureId);

  const newCoordinate: [number, number] = toPasture
    ? polygonCentroid(toPasture.geometry.coordinates as [number, number][][])
    : herd.coordinate;

  // Update the herd in-place (immutably)
  farm.herds = farm.herds.map((h) =>
    h.id === herdId
      ? { ...h, pastureId: entry.toPastureId, entryDate: entry.movedAt, coordinate: newCoordinate }
      : h
  );

  // Append movement log
  const movement = {
    id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    herdId,
    herdName: herd.name,
    fromPastureId: fromPasture?.id ?? null,
    fromPastureName: fromPasture?.name ?? null,
    toPastureId: entry.toPastureId,
    toPastureName: toPasture?.name ?? entry.toPastureId,
    movedAt: entry.movedAt,
    movedBy: entry.movedBy,
    notes: entry.notes ?? null,
  };

  farm.movements = [...farm.movements, movement];
  saveStoredFarm(farm);
  return farm;
}

// ─── Add herd mutation ───────────────────────────────────────────────────────

export interface AddHerdInput {
  pastureId: string;
  name: string;
  cattleCount: number;
  breed: string;
  species?: HerdSpecies;
  entryDate: Date;
}

/**
 * Append a new Herd to the stored farm and persist to localStorage.
 * Coordinate is set to the pasture centroid.
 * Returns the updated StoredFarm, or null if farm/pasture is not found.
 */
export function addHerd(input: AddHerdInput): StoredFarm | null {
  const farm = loadStoredFarm();
  if (!farm) return null;

  const pasture = farm.pastures.find((p) => p.id === input.pastureId);
  if (!pasture) return null;

  const coordinate: [number, number] = polygonCentroid(
    pasture.geometry.coordinates as [number, number][][]
  );

  const herd: Herd = {
    id: `herd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name,
    pastureId: input.pastureId,
    cattleCount: input.cattleCount,
    breed: input.breed,
    species: input.species ?? 'bovino',
    status: 'active',
    entryDate: input.entryDate,
    coordinate,
  };

  farm.herds = [...farm.herds, herd];
  saveStoredFarm(farm);
  return farm;
}

// ─── Add pasture mutation ─────────────────────────────────────────────────────

export interface AddPastureInput {
  name: string;
  carryingCapacity: number;
  /** Drawn polygon ring(s) from map drawing mode */
  coordinates: [number, number][][];
  grassType?: GrassType;
  waterSupply?: WaterSupplyType;
  notes?: string;
}

const PASTURE_COLORS = ['#DEFF9A', '#9ADEFF', '#FF9ADE', '#FFD59A', '#B9FF9A', '#FF9A9A', '#9AFFDE'];

/**
 * Append a new Pasture to the stored farm and persist to localStorage.
 * Area is computed from the polygon coordinates (Shoelace formula).
 * Returns the updated StoredFarm, or null if no farm is stored yet.
 */
export function addPasture(input: AddPastureInput): StoredFarm | null {
  const farm = loadStoredFarm();
  if (!farm) return null;

  const areaHectares = polygonAreaHectares(input.coordinates);
  const color = PASTURE_COLORS[farm.pastures.length % PASTURE_COLORS.length];

  const pasture: Pasture = {
    id: `pasture-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: input.name,
    areaHectares,
    carryingCapacity: input.carryingCapacity,
    color,
    geometry: { type: 'Polygon', coordinates: input.coordinates },
    grassType: input.grassType,
    waterSupply: input.waterSupply,
    notes: input.notes,
  };

  farm.pastures = [...farm.pastures, pasture];
  farm.totalAreaHectares = farm.pastures.reduce((s, p) => s + p.areaHectares, 0);
  saveStoredFarm(farm);
  return farm;
}

export function buildStoredFarm(input: FarmInput): StoredFarm {
  const now = new Date().toISOString();
  const farmId = 'farm-custom';

  const pastures: Pasture[] = input.pastures.map((p, i) => {
    const geometry = p.coordinates
      ? { type: 'Polygon' as const, coordinates: p.coordinates }
      : generatePolygon(p.center!, p.areaHectares);
    const areaHectares = p.coordinates
      ? polygonAreaHectares(p.coordinates)
      : p.areaHectares;
    return {
      id: `pasture-${i + 1}`,
      name: p.name,
      areaHectares,
      carryingCapacity: p.carryingCapacity,
      color: '#DEFF9A',
      geometry,
      grassType: p.grassType,
      waterSupply: p.waterSupply,
      elevationM: p.elevationM,
      notes: p.notes,
    };
  });

  const herds: Herd[] = input.herds.map((h, i) => {
    const pasture = pastures.find((p) => p.id === h.pastureId);
    const center: [number, number] = pasture
      ? polygonCentroid(pasture.geometry.coordinates as [number, number][][])
      : [-63.0, -34.0];
    return {
      id: `herd-${i + 1}`,
      name: h.name,
      pastureId: h.pastureId,
      cattleCount: h.cattleCount,
      breed: h.breed,
      status: 'active' as const,
      entryDate: new Date(h.entryDate),
      coordinate: center,
    };
  });

  const totalArea = pastures.reduce((s, p) => s + p.areaHectares, 0);
  // Derive farm center from the first pasture's actual geometry (works for both drawn and GeoJSON polygons)
  const location: [number, number] = pastures.length > 0
    ? polygonCentroid(pastures[0].geometry.coordinates as [number, number][][])
    : [-63.0, -34.0];

  return {
    id: farmId,
    name: input.name,
    ownerName: input.ownerName,
    totalAreaHectares: totalArea,
    location,
    pastures,
    herds,
    infrastructure: [],
    movements: [],
    healthRecords: [],
    weightRecords: [],
    employees:    [],
    fuelLogs:     [],
    expenses:     [],
    machinery:    [],
    createdAt: now,
    updatedAt: now,
  };
}

// ─── ERP mutations (Phase I) ──────────────────────────────────────────────────

function nanoid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function addEmployee(input: AddEmployeeInput): Employee | null {
  const farm = loadStoredFarm();
  if (!farm) return null;
  const emp: Employee = {
    id:             nanoid(),
    farmId:         farm.id,
    name:           input.name,
    role:           input.role ?? null,
    idNumber:       input.idNumber ?? null,
    hireDate:       input.hireDate ?? null,
    salaryMonthly:  input.salaryMonthly ?? null,
    phone:          input.phone ?? null,
    active:         true,
    notes:          input.notes ?? null,
  };
  farm.employees = [...(farm.employees ?? []), emp];
  saveStoredFarm(farm);
  return emp;
}

export function addFuelLog(input: AddFuelLogInput): FuelLog | null {
  const farm = loadStoredFarm();
  if (!farm) return null;
  const log: FuelLog = {
    id:               nanoid(),
    farmId:           farm.id,
    date:             input.date,
    liters:           input.liters,
    costPerLiter:     input.costPerLiter ?? null,
    totalCost:        input.costPerLiter != null ? input.liters * input.costPerLiter : null,
    vehicleEquipment: input.vehicleEquipment ?? null,
    purpose:          input.purpose ?? null,
    odometerKm:       input.odometerKm ?? null,
    notes:            input.notes ?? null,
  };
  farm.fuelLogs = [...(farm.fuelLogs ?? []), log];
  saveStoredFarm(farm);
  return log;
}

export function addExpense(input: AddExpenseInput): Expense | null {
  const farm = loadStoredFarm();
  if (!farm) return null;
  const exp: Expense = {
    id:                 nanoid(),
    farmId:             farm.id,
    date:               input.date,
    category:           input.category,
    description:        input.description,
    amount:             input.amount,
    supplier:           input.supplier ?? null,
    appliedToHerdId:    input.appliedToHerdId ?? null,
    appliedToPastureId: input.appliedToPastureId ?? null,
    receiptUrl:         null,
    notes:              input.notes ?? null,
  };
  farm.expenses = [...(farm.expenses ?? []), exp];
  saveStoredFarm(farm);
  return exp;
}

export function addMachine(input: Omit<Machine, 'id' | 'farmId'>): Machine | null {
  const farm = loadStoredFarm();
  if (!farm) return null;
  const m: Machine = { id: nanoid(), farmId: farm.id, ...input };
  farm.machinery = [...(farm.machinery ?? []), m];
  saveStoredFarm(farm);
  return m;
}
