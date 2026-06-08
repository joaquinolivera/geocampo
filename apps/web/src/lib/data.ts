/**
 * @fileoverview Demo data for GeoCampo web dashboard
 * Same domain data as mobile/src/data/seed.ts, without React Native imports.
 * Replace with Supabase queries when NEXT_PUBLIC_SUPABASE_URL is configured.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

// Grass / forage types common in the Río de la Plata region
export type GrassType =
  | 'natural'       // Pastura natural / campo natural
  | 'mejorado'      // Campo mejorado (oversown natural)
  | 'ryegrass'      // Raigrás + trébol
  | 'alfalfa'       // Alfalfa
  | 'brachiaria'    // Brachiaria / Pasto estrella
  | 'sorgo'         // Sorgo forrajero
  | 'maiz'          // Maíz para silaje
  | 'festuca'       // Festuca + trébol rojo
  | 'otro';         // Otro

export type WaterSupplyType =
  | 'tajamar'       // Represa / tajamar
  | 'molino'        // Molino de viento
  | 'bebedero'      // Bebedero (trough fed by pump)
  | 'arroyo'        // Natural stream / arroyo
  | 'pozo'          // Well / pozo
  | 'none';         // Sin agua propia

export interface Pasture {
  id: string;
  name: string;
  areaHectares: number;
  carryingCapacity: number;
  color: string;
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][];
  };
  // Optional enriched metadata (present when entered via setup wizard or GeoJSON import)
  grassType?: GrassType;
  waterSupply?: WaterSupplyType;
  elevationM?: number;   // average elevation in metres (from Mapbox terrain)
  notes?: string;
}

export type HerdSpecies =
  | 'bovino'   // Cattle / bovinos
  | 'ovino'    // Sheep / ovejas
  | 'caprino'  // Goats / cabras
  | 'equino'   // Horses / equinos
  | 'porcino'  // Pigs / cerdos
  | 'otro';    // Other

export interface Herd {
  id: string;
  name: string;
  pastureId: string;
  cattleCount: number;
  breed: string;
  species?: HerdSpecies; // defaults to 'bovino' for legacy records
  status: 'active' | 'moved' | 'sold' | 'inactive';
  entryDate: Date;
  coordinate: [number, number]; // [lon, lat] for marker
}

export interface WeightRecord {
  id: string;
  herdId: string;
  weightKg: number;
  cattleCount: number;
  averageWeightKg: number;
  weighedAt: Date;
  weighedBy: string;
  notes: string | null;
}

export interface HealthRecord {
  id: string;
  herdId: string;
  treatmentType: 'vaccination' | 'deworming' | 'treatment' | 'checkup';
  productName: string | null;
  dosage: string | null;
  administeredBy: string;
  administeredAt: Date;
  nextDueDate: Date | null;
  notes: string | null;
}

// ─── Infrastructure ────────────────────────────────────────────────────────────

export type InfraType = 'water' | 'fence' | 'corral' | 'building';
export type InfraCondition = 'buena' | 'regular' | 'mala';

export type InfraGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | { type: 'LineString'; coordinates: [number, number][] }
  | { type: 'Polygon'; coordinates: [number, number][][] };

export interface InfrastructureFeature {
  id: string;
  farmId: string;
  type: InfraType;
  /** Subtype in Spanish: tajamar, molino, bebedero, pozo, galpon, casco, manga, corral, bañadero, alambrado */
  subtype: string;
  name: string;
  geometry: InfraGeometry;
  condition: InfraCondition;
  capacity?: number; // for water: m³ / for corrals: heads
  notes?: string;
}

export interface Movement {
  id: string;
  herdId: string;
  herdName: string;
  fromPastureId?: string | null;
  fromPastureName: string | null;
  toPastureId?: string;
  toPastureName: string;
  movedAt: Date;
  movedBy: string;
  notes?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Farm ─────────────────────────────────────────────────────────────────────

export const DEMO_FARM = {
  id: 'farm-1',
  name: 'Estancia Las Pampas',
  ownerName: 'Roberto Álvarez',
  totalAreaHectares: 320.5,
  location: [-58.39, -34.62] as [number, number], // center for map camera
};

// ─── Pastures ─────────────────────────────────────────────────────────────────

export const PASTURES: Pasture[] = [
  {
    id: 'pasture-1',
    name: 'Potrero Norte',
    areaHectares: 45.2,
    carryingCapacity: 50,
    color: '#DEFF9A',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-58.42, -34.58],
          [-58.38, -34.58],
          [-58.38, -34.62],
          [-58.42, -34.62],
          [-58.42, -34.58],
        ],
      ],
    },
  },
  {
    id: 'pasture-2',
    name: 'Potrero Sur',
    areaHectares: 32.8,
    carryingCapacity: 35,
    color: '#9ADEFF',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-58.42, -34.63],
          [-58.38, -34.63],
          [-58.38, -34.67],
          [-58.42, -34.67],
          [-58.42, -34.63],
        ],
      ],
    },
  },
  {
    id: 'pasture-3',
    name: 'Potrero Este',
    areaHectares: 28.5,
    carryingCapacity: 25, // ← overloaded!
    color: '#FF9ADE',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-58.37, -34.60],
          [-58.33, -34.60],
          [-58.33, -34.65],
          [-58.37, -34.65],
          [-58.37, -34.60],
        ],
      ],
    },
  },
];

// ─── Herds ────────────────────────────────────────────────────────────────────

export const HERDS: Herd[] = [
  {
    id: 'herd-1',
    name: 'Vacas Preñadas Lote A',
    pastureId: 'pasture-1',
    cattleCount: 45,
    breed: 'Hereford',
    status: 'active',
    entryDate: daysAgo(120),
    coordinate: [-58.40, -34.60],
  },
  {
    id: 'herd-2',
    name: 'Novillos Lote B',
    pastureId: 'pasture-2',
    cattleCount: 32,
    breed: 'Aberdeen Angus',
    status: 'active',
    entryDate: daysAgo(90),
    coordinate: [-58.40, -34.65],
  },
  {
    id: 'herd-3',
    name: 'Vaquillas Lote C',
    pastureId: 'pasture-3',
    cattleCount: 28, // exceeds capacity of 25
    breed: 'Hereford',
    status: 'active',
    entryDate: daysAgo(60),
    coordinate: [-58.35, -34.625],
  },
];

// ─── Weights ──────────────────────────────────────────────────────────────────

export const WEIGHTS: WeightRecord[] = [
  {
    id: 'w-1',
    herdId: 'herd-1',
    weightKg: 18900,
    cattleCount: 45,
    averageWeightKg: 420,
    weighedAt: daysAgo(60),
    weighedBy: 'Roberto Álvarez',
    notes: 'Pesaje inicial lote A',
  },
  {
    id: 'w-2',
    herdId: 'herd-1',
    weightKg: 20250,
    cattleCount: 45,
    averageWeightKg: 450,
    weighedAt: daysAgo(30),
    weighedBy: 'Roberto Álvarez',
    notes: null,
  },
  {
    id: 'w-3',
    herdId: 'herd-2',
    weightKg: 12800,
    cattleCount: 32,
    averageWeightKg: 400,
    weighedAt: daysAgo(45),
    weighedBy: 'Roberto Álvarez',
    notes: null,
  },
  {
    id: 'w-4',
    herdId: 'herd-2',
    weightKg: 14080,
    cattleCount: 32,
    averageWeightKg: 440,
    weighedAt: daysAgo(15),
    weighedBy: 'Roberto Álvarez',
    notes: null,
  },
  {
    id: 'w-5',
    herdId: 'herd-3',
    weightKg: 8680,
    cattleCount: 28,
    averageWeightKg: 310,
    weighedAt: daysAgo(20),
    weighedBy: 'Roberto Álvarez',
    notes: 'Vaquillas recién ingresadas',
  },
];

// ─── Health ───────────────────────────────────────────────────────────────────

export const HEALTH_RECORDS: HealthRecord[] = [
  {
    id: 'h-1',
    herdId: 'herd-2',
    treatmentType: 'deworming',
    productName: 'Dectomax',
    dosage: '1ml/50kg',
    administeredBy: 'Dr. García',
    administeredAt: daysAgo(93),
    nextDueDate: daysAgo(3), // OVERDUE
    notes: null,
  },
  {
    id: 'h-2',
    herdId: 'herd-1',
    treatmentType: 'vaccination',
    productName: 'Clostrisan',
    dosage: '2ml',
    administeredBy: 'Dr. García',
    administeredAt: daysAgo(180),
    nextDueDate: daysFromNow(5), // URGENT
    notes: 'Refuerzo anual clostridios',
  },
  {
    id: 'h-3',
    herdId: 'herd-3',
    treatmentType: 'checkup',
    productName: null,
    dosage: null,
    administeredBy: 'Dr. García',
    administeredAt: daysAgo(45),
    nextDueDate: daysFromNow(14), // UPCOMING
    notes: 'Control preñez vaquillas',
  },
  {
    id: 'h-4',
    herdId: 'herd-1',
    treatmentType: 'treatment',
    productName: 'Oxitetraciclina',
    dosage: '5ml',
    administeredBy: 'Dr. García',
    administeredAt: daysAgo(20),
    nextDueDate: null,
    notes: 'Vaca 42 — lesión en pata',
  },
];

// ─── Movements ────────────────────────────────────────────────────────────────

export const MOVEMENTS: Movement[] = [
  {
    id: 'm-1',
    herdId: 'herd-3',
    herdName: 'Vaquillas Lote C',
    fromPastureName: 'Potrero Sur',
    toPastureName: 'Potrero Este',
    movedAt: daysAgo(60),
    movedBy: 'Roberto Álvarez',
  },
  {
    id: 'm-2',
    herdId: 'herd-1',
    herdName: 'Vacas Preñadas Lote A',
    fromPastureName: null,
    toPastureName: 'Potrero Norte',
    movedAt: daysAgo(120),
    movedBy: 'Roberto Álvarez',
  },
  {
    id: 'm-3',
    herdId: 'herd-2',
    herdName: 'Novillos Lote B',
    fromPastureName: null,
    toPastureName: 'Potrero Sur',
    movedAt: daysAgo(90),
    movedBy: 'Roberto Álvarez',
  },
];

// ─── Infrastructure features ──────────────────────────────────────────────────
// All coordinates are within the Estancia Las Pampas area.
// Points: [longitude, latitude]. Lines/Polygons: rings of [lon, lat] pairs.

export const INFRASTRUCTURE: InfrastructureFeature[] = [
  // ── Water ──────────────────────────────────────────────────────────────────

  {
    id: 'infra-1',
    farmId: 'farm-1',
    type: 'water',
    subtype: 'tajamar',
    name: 'Tajamar Norte',
    geometry: { type: 'Point', coordinates: [-58.413, -34.593] },
    condition: 'buena',
    capacity: 1200, // m³
    notes: 'Nivel óptimo. Revisión última lluvia mayo 2026.',
  },
  {
    id: 'infra-2',
    farmId: 'farm-1',
    type: 'water',
    subtype: 'molino',
    name: 'Molino Sur',
    geometry: { type: 'Point', coordinates: [-58.404, -34.645] },
    condition: 'regular',
    capacity: undefined,
    notes: 'Aspa con juego, programado mantenimiento jul 2026.',
  },
  {
    id: 'infra-3',
    farmId: 'farm-1',
    type: 'water',
    subtype: 'bebedero',
    name: 'Bebedero Potrero Este',
    geometry: { type: 'Point', coordinates: [-58.352, -34.623] },
    condition: 'buena',
    capacity: 800,
    notes: 'Alimentado por bomba sumergible.',
  },

  // ── Fences ─────────────────────────────────────────────────────────────────

  {
    id: 'infra-4',
    farmId: 'farm-1',
    type: 'fence',
    subtype: 'alambrado',
    name: 'División Norte–Sur',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-58.42, -34.625],
        [-58.38, -34.625],
      ],
    },
    condition: 'buena',
    notes: 'Alambrado de 5 hilos renovado 2024.',
  },
  {
    id: 'infra-5',
    farmId: 'farm-1',
    type: 'fence',
    subtype: 'alambrado',
    name: 'Límite Este',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-58.37, -34.58],
        [-58.37, -34.67],
      ],
    },
    condition: 'regular',
    notes: 'Tramo medio requiere tensado. Inspección pendiente.',
  },
  {
    id: 'infra-6',
    farmId: 'farm-1',
    type: 'fence',
    subtype: 'alambrado',
    name: 'Perímetro Norte',
    geometry: {
      type: 'LineString',
      coordinates: [
        [-58.42, -34.575],
        [-58.33, -34.575],
      ],
    },
    condition: 'buena',
    notes: 'Perimetral en buen estado.',
  },

  // ── Corrals & handling ─────────────────────────────────────────────────────

  {
    id: 'infra-7',
    farmId: 'farm-1',
    type: 'corral',
    subtype: 'manga',
    name: 'Manga y Corral de Trabajo',
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [-58.418, -34.578],
          [-58.414, -34.578],
          [-58.414, -34.581],
          [-58.418, -34.581],
          [-58.418, -34.578],
        ],
      ],
    },
    condition: 'buena',
    capacity: 80, // heads
    notes: 'Manga con báscula electrónica. Bañadera adjunta.',
  },

  // ── Buildings ──────────────────────────────────────────────────────────────

  {
    id: 'infra-8',
    farmId: 'farm-1',
    type: 'building',
    subtype: 'casco',
    name: 'Casco Principal',
    geometry: { type: 'Point', coordinates: [-58.416, -34.576] },
    condition: 'buena',
    notes: 'Casa principal, oficina y depósito de veterinaria.',
  },
  {
    id: 'infra-9',
    farmId: 'farm-1',
    type: 'building',
    subtype: 'galpon',
    name: 'Galpón de Maquinaria',
    geometry: { type: 'Point', coordinates: [-58.411, -34.577] },
    condition: 'buena',
    notes: 'Tractor John Deere 5090E, rastra, rolo.',
  },
];
