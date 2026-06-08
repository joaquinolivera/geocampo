/**
 * Shared utilities for the data access layer.
 */

import { IS_DEMO_MODE, getBrowserClient, getActiveFarmId } from '@/lib/supabase';

export { IS_DEMO_MODE, getBrowserClient, getActiveFarmId };

/** Returns the Supabase client, asserting production mode. */
export function requireClient() {
  const client = getBrowserClient();
  if (!client) throw new Error('getBrowserClient() returned null in production mode');
  return client;
}

/** Throws if we're in demo mode — used for write operations that need the real DB. */
export function assertProduction() {
  if (IS_DEMO_MODE) throw new Error('This operation requires a real Supabase connection.');
}
