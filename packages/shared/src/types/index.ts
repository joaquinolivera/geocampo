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

// ─── Phase G — Individual cattle (DIOB / SENACSA) ────────────────────────────

export type CattleSex    = 'male' | 'female' | 'castrated';
export type CattleStatus = 'active' | 'sold' | 'deceased' | 'transferred';

export interface Cattle {
  id:           string;
  farmId:       string;
  herdId:       string | null;
  /** ISO 11784/11785 FDX-B EID — 15-digit DIOB chip number (left ear) */
  chipId:       string | null;
  /** Printed visual tag number (right ear) */
  visualTagId:  string | null;
  sex:          CattleSex | null;
  breed:        string | null;
  dob:          Date | null;
  status:       CattleStatus;
  notes:        string | null;
  createdAt:    Date;
  updatedAt:    Date;
}

export interface AddCattleInput {
  herdId:       string;
  chipId?:      string;
  visualTagId?: string;
  sex?:         CattleSex;
  breed?:       string;
  dob?:         Date;
  notes?:       string;
}

export interface UpdateCattleInput {
  herdId?:      string | null;
  chipId?:      string | null;
  visualTagId?: string | null;
  sex?:         CattleSex | null;
  breed?:       string | null;
  dob?:         Date | null;
  status?:      CattleStatus;
  notes?:       string | null;
}

// GeoJSON types are provided by @types/geojson package
