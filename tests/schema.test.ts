/**
 * @fileoverview Phase 0 TDD: Supabase Schema Validation
 * Tests validate that schema.sql defines the correct structure
 * for GeoCampo's offline-first livestock management system.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('GeoCampo Supabase Schema', () => {
  let schema: string;

  beforeAll(() => {
    const schemaPath = resolve(__dirname, '../supabase/schema.sql');
    schema = readFileSync(schemaPath, 'utf-8');
  });

  describe('PostGIS Extension', () => {
    it('should enable PostGIS extension', () => {
      expect(schema).toMatch(/create extension if not exists postgis/i);
    });
  });

  describe('Core Tables', () => {
    const requiredTables = [
      'farms',
      'pastures',
      'herds',
      'weights',
      'health',
      'movements',
    ];

    requiredTables.forEach((table) => {
      it(`should define ${table} table`, () => {
        const tableRegex = new RegExp(
          `create table if not exists\\s+${table}\\s*\\(`,
          'i'
        );
        expect(schema).toMatch(tableRegex);
      });
    });
  });

  describe('Geospatial Columns', () => {
    it('farms should have location point geometry', () => {
      expect(schema).toMatch(
        /farms[\s\S]*?location\s+geometry\(point,\s*4326\)/i
      );
    });

    it('pastures should have polygon geometry', () => {
      expect(schema).toMatch(
        /pastures[\s\S]*?geometry\s+geometry\(polygon,\s*4326\)/i
      );
    });

    it('pastures should auto-compute area from geometry', () => {
      expect(schema).toMatch(/st_area\(geometry::geography\)/i);
    });
  });

  describe('Foreign Key Relationships', () => {
    it('pastures should reference farms', () => {
      expect(schema).toMatch(
        /pastures[\s\S]*?farm_id\s+uuid\s+not\s+null\s+references\s+farms\(id\)/i
      );
    });

    it('herds should reference farms and pastures', () => {
      expect(schema).toMatch(
        /herds[\s\S]*?pasture_id\s+uuid\s+references\s+pastures\(id\)/i
      );
      expect(schema).toMatch(
        /herds[\s\S]*?farm_id\s+uuid\s+not\s+null\s+references\s+farms\(id\)/i
      );
    });

    it('weights should reference herds', () => {
      expect(schema).toMatch(
        /weights[\s\S]*?herd_id\s+uuid\s+not\s+null\s+references\s+herds\(id\)/i
      );
    });

    it('health should reference herds', () => {
      expect(schema).toMatch(
        /health[\s\S]*?herd_id\s+uuid\s+not\s+null\s+references\s+herds\(id\)/i
      );
    });

    it('movements should reference herds and pastures', () => {
      expect(schema).toMatch(
        /movements[\s\S]*?herd_id\s+uuid\s+not\s+null\s+references\s+herds\(id\)/i
      );
      expect(schema).toMatch(
        /movements[\s\S]*?to_pasture_id\s+uuid\s+not\s+null\s+references\s+pastures\(id\)/i
      );
    });
  });

  describe('Spatial Indexes', () => {
    it('should create GIST index on pastures geometry', () => {
      expect(schema).toMatch(
        /create index if not exists\s+idx_pastures_geometry\s+on\s+pastures\s+using\s+gist\(geometry\)/i
      );
    });
  });

  describe('Auto-Update Triggers', () => {
    it('should have update_updated_at_column function', () => {
      expect(schema).toMatch(/create or replace function update_updated_at_column/i);
    });

    ['farms', 'pastures', 'herds'].forEach((table) => {
      it(`should auto-update ${table}.updated_at`, () => {
        const triggerRegex = new RegExp(
          `create trigger update_${table}_updated_at`,
          'i'
        );
        expect(schema).toMatch(triggerRegex);
      });
    });
  });

  describe('Business Logic Triggers', () => {
    it('should log herd movements automatically', () => {
      expect(schema).toMatch(/create or replace function log_herd_movement/i);
      expect(schema).toMatch(/create trigger log_movement_on_herd_change/i);
    });

    it('should update pasture current_herd_id on herd assignment', () => {
      expect(schema).toMatch(/create or replace function update_pasture_current_herd/i);
      expect(schema).toMatch(/create trigger update_pasture_on_herd_change/i);
    });
  });

  describe('PowerSync Configuration', () => {
    it('should define powersync_sync_rules table', () => {
      expect(schema).toMatch(/create table if not exists powersync_sync_rules/i);
    });

    it('should configure sync rules for all core tables', () => {
      const coreTables = ['farms', 'pastures', 'herds', 'weights', 'health', 'movements'];
      coreTables.forEach((table) => {
        const insertRegex = new RegExp(
          `\\('${table}',\\s*null\\)`,
          'i'
        );
        expect(schema).toMatch(insertRegex);
      });
    });
  });
});
