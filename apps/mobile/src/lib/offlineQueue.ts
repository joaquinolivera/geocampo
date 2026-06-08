/**
 * @fileoverview Offline action queue for GeoCampo mobile.
 *
 * PowerSync already handles SQL writes offline, but some actions (e.g. uploading
 * photos, calling external APIs) need their own queue.
 *
 * This module wraps expo-sqlite (already a transitive dep via expo-sqlite) to
 * persist queued actions across app restarts.
 *
 * Usage:
 *   await OfflineQueue.enqueue({ type: 'upload_photo', payload: { ... } });
 *   // When online:
 *   await OfflineQueue.flush(async (action) => { ... execute ... });
 */

import * as SQLite from 'expo-sqlite';

export type ActionType =
  | 'upload_photo'
  | 'sync_weight'
  | 'sync_health'
  | 'sync_movement'
  | 'send_notification';

export interface QueuedAction {
  id:         string;
  type:       ActionType;
  payload:    string;   // JSON
  createdAt:  number;   // ms
  attempts:   number;
  lastError:  string | null;
}

const DB_NAME  = 'geocampo_queue.db';
const TABLE    = 'action_queue';

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync(DB_NAME);
    await _db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${TABLE} (
        id          TEXT PRIMARY KEY,
        type        TEXT NOT NULL,
        payload     TEXT NOT NULL,
        created_at  INTEGER NOT NULL,
        attempts    INTEGER NOT NULL DEFAULT 0,
        last_error  TEXT
      );
    `);
  }
  return _db;
}

export const OfflineQueue = {
  /** Add an action to the queue. Returns the enqueued action. */
  async enqueue<T = unknown>(type: ActionType, payload: T): Promise<QueuedAction> {
    const db = await getDb();
    const action: QueuedAction = {
      id:         Math.random().toString(36).slice(2, 10),
      type,
      payload:    JSON.stringify(payload),
      createdAt:  Date.now(),
      attempts:   0,
      lastError:  null,
    };
    await db.runAsync(
      `INSERT INTO ${TABLE} (id, type, payload, created_at, attempts, last_error)
       VALUES (?, ?, ?, ?, 0, NULL)`,
      [action.id, action.type, action.payload, action.createdAt]
    );
    return action;
  },

  /** Return all queued actions ordered by creation date. */
  async list(): Promise<QueuedAction[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<{
      id: string; type: string; payload: string;
      created_at: number; attempts: number; last_error: string | null;
    }>(`SELECT * FROM ${TABLE} ORDER BY created_at ASC`);
    return rows.map((r) => ({
      id:        r.id,
      type:      r.type as ActionType,
      payload:   r.payload,
      createdAt: r.created_at,
      attempts:  r.attempts,
      lastError: r.last_error,
    }));
  },

  /** Count pending actions. */
  async count(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) as n FROM ${TABLE}`);
    return row?.n ?? 0;
  },

  /**
   * Process all queued actions in order.
   * @param executor  Called with each action; throw to mark it as failed.
   * @param maxRetries  Skip actions that have exceeded this many attempts (default: 5).
   */
  async flush(
    executor: (action: QueuedAction) => Promise<void>,
    maxRetries = 5,
  ): Promise<{ succeeded: number; failed: number }> {
    const db = await getDb();
    const actions = await OfflineQueue.list();
    let succeeded = 0;
    let failed = 0;

    for (const action of actions) {
      if (action.attempts >= maxRetries) { failed++; continue; }
      try {
        await executor(action);
        await db.runAsync(`DELETE FROM ${TABLE} WHERE id = ?`, [action.id]);
        succeeded++;
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        await db.runAsync(
          `UPDATE ${TABLE} SET attempts = attempts + 1, last_error = ? WHERE id = ?`,
          [msg, action.id]
        );
        failed++;
      }
    }

    return { succeeded, failed };
  },

  /** Remove a specific action (e.g. permanently abandoned). */
  async remove(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
  },

  /** Clear the entire queue. */
  async clear(): Promise<void> {
    const db = await getDb();
    await db.runAsync(`DELETE FROM ${TABLE}`);
  },
};
