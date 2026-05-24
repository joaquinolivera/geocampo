/**
 * @fileoverview PowerSync Client Setup
 * Initializes PowerSync for offline-first synchronization with Supabase.
 */

import { PowerSyncDatabase } from '@powersync/react-native';
import { appSchema, DATABASE_NAME, TABLE_NAMES } from './schema';

export interface SyncConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  powersyncUrl?: string;
}

/**
 * Initialize the PowerSync database instance
 */
export function createPowerSyncDatabase(): PowerSyncDatabase {
  const db = new PowerSyncDatabase({
    schema: appSchema as any,
    database: {
      dbFilename: DATABASE_NAME,
    },
  });

  return db;
}

/**
 * Initialize database tables
 */
export async function initializeDatabase(db: PowerSyncDatabase): Promise<void> {
  await db.init();
  console.log('PowerSync database initialized');
}

/**
 * Configure PowerSync sync rules to match Supabase schema
 */
export function getSyncRules() {
  return TABLE_NAMES.map((table) => ({
    table,
  }));
}

/**
 * Connect to Supabase for sync
 */
export async function connectToSupabase(
  db: PowerSyncDatabase,
  config: SyncConfig
): Promise<void> {
  // TODO: Implement actual Supabase connector
  // This will use @powersync/react-native connector
  console.log('Connecting to Supabase...', config.supabaseUrl);
}
