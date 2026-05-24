/**
 * @fileoverview Phase 1 TDD: Database Schema Tests
 * Validates the local SQLite schema generation for PowerSync
 */

import { appSchema, generateLocalSchema, TABLE_NAMES, DATABASE_NAME } from '../src/schema';

describe('PowerSync Local Database Schema', () => {
  describe('Schema Generation', () => {
    it('should generate reference SQLite DDL', () => {
      const schema = generateLocalSchema();
      expect(schema).toContain('PRAGMA foreign_keys = ON');
    });

    it('should have a valid PowerSync schema object', () => {
      expect(appSchema).toBeDefined();
      expect(appSchema.tables).toBeDefined();
      expect(appSchema.tables.length).toBeGreaterThan(0);
    });

    it('should define all required tables in PowerSync schema', () => {
      const requiredTables = ['farms', 'pastures', 'herds', 'weights', 'health', 'movements'];
      
      requiredTables.forEach((tableName) => {
        const table = appSchema.tables.find((t) => t.name === tableName);
        expect(table).toBeDefined();
      });
    });

    it('should have correct column definitions for farms', () => {
      const farms = appSchema.tables.find((t) => t.name === 'farms');
      expect(farms).toBeDefined();
      
      const columnNames = farms!.columns.map((c) => c.name);
      expect(columnNames).toContain('name');
      expect(columnNames).toContain('location');
      expect(columnNames).toContain('total_area_hectares');
    });

    it('should have correct column definitions for pastures', () => {
      const pastures = appSchema.tables.find((t) => t.name === 'pastures');
      expect(pastures).toBeDefined();
      
      const columnNames = pastures!.columns.map((c) => c.name);
      expect(columnNames).toContain('geometry');
      expect(columnNames).toContain('area_hectares');
      expect(columnNames).toContain('carrying_capacity');
    });

    it('should have correct column definitions for herds', () => {
      const herds = appSchema.tables.find((t) => t.name === 'herds');
      expect(herds).toBeDefined();
      
      const columnNames = herds!.columns.map((c) => c.name);
      expect(columnNames).toContain('cattle_count');
      expect(columnNames).toContain('status');
    });

    it('should have correct column definitions for weights', () => {
      const weights = appSchema.tables.find((t) => t.name === 'weights');
      expect(weights).toBeDefined();
      
      const columnNames = weights!.columns.map((c) => c.name);
      expect(columnNames).toContain('weight_kg');
      expect(columnNames).toContain('average_weight_kg');
    });

    it('should have correct column definitions for health', () => {
      const health = appSchema.tables.find((t) => t.name === 'health');
      expect(health).toBeDefined();
      
      const columnNames = health!.columns.map((c) => c.name);
      expect(columnNames).toContain('treatment_type');
      expect(columnNames).toContain('next_due_date');
    });

    it('should have correct column definitions for movements', () => {
      const movements = appSchema.tables.find((t) => t.name === 'movements');
      expect(movements).toBeDefined();
      
      const columnNames = movements!.columns.map((c) => c.name);
      expect(columnNames).toContain('from_pasture_id');
      expect(columnNames).toContain('to_pasture_id');
      expect(columnNames).toContain('verified_by_turf');
    });
  });

  describe('Indexes', () => {
    it('should create indexes for foreign keys in pastures', () => {
      const pastures = appSchema.tables.find((t) => t.name === 'pastures');
      expect(pastures).toBeDefined();
      expect(pastures!.indexes.length).toBeGreaterThan(0);
    });

    it('should create indexes for status queries in herds', () => {
      const herds = appSchema.tables.find((t) => t.name === 'herds');
      expect(herds).toBeDefined();
      expect(herds!.indexes.length).toBeGreaterThan(0);
    });
  });

  describe('Database Configuration', () => {
    it('should have consistent database name', () => {
      expect(DATABASE_NAME).toBe('geocampo.db');
    });

    it('should export all table names', () => {
      expect(TABLE_NAMES).toHaveLength(6);
      expect(TABLE_NAMES).toContain('farms');
      expect(TABLE_NAMES).toContain('pastures');
      expect(TABLE_NAMES).toContain('herds');
      expect(TABLE_NAMES).toContain('weights');
      expect(TABLE_NAMES).toContain('health');
      expect(TABLE_NAMES).toContain('movements');
    });
  });
});
