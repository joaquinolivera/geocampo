/**
 * @fileoverview Phase 1 TDD: PowerSync Setup Tests
 * Validates PowerSync client initialization and configuration
 */

import { createPowerSyncDatabase, initializeDatabase, getSyncRules, connectToSupabase } from '../src/powersync';
import { generateLocalSchema } from '../src/schema';

// Mock PowerSyncDatabase
jest.mock('@powersync/react-native', () => ({
  PowerSyncDatabase: jest.fn().mockImplementation(({ schema }) => ({
    execute: jest.fn(),
    executeBatch: jest.fn(),
    getAll: jest.fn(),
    get: jest.fn(),
    close: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
    init: jest.fn().mockResolvedValue(undefined),
    waitForReady: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('PowerSync Setup', () => {
  describe('Database Creation', () => {
    it('should create PowerSync database with correct schema', () => {
      const db = createPowerSyncDatabase();
      expect(db).toBeDefined();
    });

    it('should initialize database successfully', async () => {
      const db = createPowerSyncDatabase();
      await expect(initializeDatabase(db)).resolves.not.toThrow();
    });
  });

  describe('Sync Configuration', () => {
    it('should define sync rules for all tables', () => {
      const rules = getSyncRules();
      const tableNames = ['farms', 'pastures', 'herds', 'weights', 'health', 'movements'];
      
      expect(rules).toHaveLength(tableNames.length);
      tableNames.forEach((name) => {
        expect(rules).toContainEqual({ table: name });
      });
    });
  });

  describe('Supabase Connection', () => {
    it('should connect to Supabase without errors', async () => {
      const db = createPowerSyncDatabase();
      const config = {
        supabaseUrl: 'https://test.supabase.co',
        supabaseAnonKey: 'test-key',
      };

      await expect(connectToSupabase(db, config)).resolves.not.toThrow();
    });
  });
});
