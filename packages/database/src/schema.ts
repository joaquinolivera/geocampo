/**
 * @fileoverview PowerSync Database Schema
 * Defines the local SQLite schema for offline-first sync.
 * Maps to the Supabase tables defined in supabase/schema.sql
 */

import { Schema, Table, column } from '@powersync/common';

export const DATABASE_NAME = 'geocampo.db';

/**
 * PowerSync Schema definition using Table V2 syntax
 * All tables mirror the Supabase schema for seamless sync
 */
export const appSchema = new Schema({
  farms: new Table({
    name: column.text,
    location: column.text, // GeoJSON Point as JSON string
    total_area_hectares: column.real,
    owner_name: column.text,
    created_at: column.integer,
    updated_at: column.integer,
  }),

  pastures: new Table({
    farm_id: column.text,
    name: column.text,
    geometry: column.text, // GeoJSON Polygon as JSON string
    area_hectares: column.real,
    carrying_capacity: column.integer,
    current_herd_id: column.text,
    color: column.text,
    created_at: column.integer,
    updated_at: column.integer,
  }, {
    indexes: {
      idx_pastures_farm: ['farm_id'],
      idx_pastures_current_herd: ['current_herd_id'],
    },
  }),

  herds: new Table({
    pasture_id: column.text,
    farm_id: column.text,
    name: column.text,
    cattle_count: column.integer,
    breed: column.text,
    entry_date: column.integer,
    exit_date: column.integer,
    status: column.text,
    created_at: column.integer,
    updated_at: column.integer,
  }, {
    indexes: {
      idx_herds_pasture: ['pasture_id'],
      idx_herds_farm: ['farm_id'],
      idx_herds_status: ['status'],
    },
  }),

  weights: new Table({
    herd_id: column.text,
    weight_kg: column.real,
    cattle_count: column.integer,
    average_weight_kg: column.real,
    weighed_at: column.integer,
    weighed_by: column.text,
    notes: column.text,
    created_at: column.integer,
  }, {
    indexes: {
      idx_weights_herd: ['herd_id'],
      idx_weights_weighed_at: ['weighed_at'],
    },
  }),

  health: new Table({
    herd_id: column.text,
    treatment_type: column.text,
    product_name: column.text,
    dosage: column.text,
    administered_by: column.text,
    administered_at: column.integer,
    next_due_date: column.integer,
    notes: column.text,
    created_at: column.integer,
  }, {
    indexes: {
      idx_health_herd: ['herd_id'],
      idx_health_administered_at: ['administered_at'],
    },
  }),

  movements: new Table({
    herd_id: column.text,
    from_pasture_id: column.text,
    to_pasture_id: column.text,
    moved_at: column.integer,
    moved_by: column.text,
    verified_by_turf: column.integer,
    notes: column.text,
    created_at: column.integer,
  }, {
    indexes: {
      idx_movements_herd: ['herd_id'],
      idx_movements_moved_at: ['moved_at'],
    },
  }),
});

/**
 * Legacy: Generates raw SQLite DDL for reference/documentation
 * PowerSync manages the actual table creation
 */
export function generateLocalSchema(): string {
  return `
-- GeoCampo Local SQLite Schema (managed by PowerSync)
-- This is a reference of the underlying table structure

PRAGMA foreign_keys = ON;

-- Core tables synced with Supabase via PowerSync
-- Tables are automatically created by PowerSync based on the Schema definition

-- See appSchema in schema.ts for the actual PowerSync schema definition
  `.trim();
}

/**
 * Table names for sync configuration
 */
export const TABLE_NAMES = [
  'farms',
  'pastures',
  'herds',
  'weights',
  'health',
  'movements',
] as const;

export type TableName = (typeof TABLE_NAMES)[number];
