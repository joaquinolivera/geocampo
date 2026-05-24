/**
 * @fileoverview Shared Domain Types
 * Core types for GeoCampo's livestock management domain.
 */

export interface Farm {
  id: string;
  name: string;
  location?: GeoJSON.Point;
  totalAreaHectares?: number;
  ownerName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pasture {
  id: string;
  farmId: string;
  name: string;
  geometry: GeoJSON.Polygon;
  areaHectares?: number;
  carryingCapacity?: number;
  currentHerdId?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Herd {
  id: string;
  pastureId?: string;
  farmId: string;
  name: string;
  cattleCount: number;
  breed?: string;
  entryDate?: Date;
  exitDate?: Date;
  status: 'active' | 'moved' | 'sold' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface Weight {
  id: string;
  herdId: string;
  weightKg: number;
  cattleCount: number;
  averageWeightKg?: number;
  weighedAt: Date;
  weighedBy?: string;
  notes?: string;
  createdAt: Date;
}

export interface Health {
  id: string;
  herdId: string;
  treatmentType: string;
  productName?: string;
  dosage?: string;
  administeredBy: string;
  administeredAt: Date;
  nextDueDate?: Date;
  notes?: string;
  createdAt: Date;
}

export interface Movement {
  id: string;
  herdId: string;
  fromPastureId?: string;
  toPastureId: string;
  movedAt: Date;
  movedBy?: string;
  verifiedByTurf: boolean;
  notes?: string;
  createdAt: Date;
}

// Re-export GeoJSON namespace for convenience
declare global {
  namespace GeoJSON {
    interface Point {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    }

    interface Polygon {
      type: 'Polygon';
      coordinates: [number, number][][]; // Array of linear rings
    }
  }
}
