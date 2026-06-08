/**
 * @fileoverview Shared utility functions for GeoCampo
 */

/** Convert a Date to a SQLite-compatible integer timestamp (milliseconds). */
export function toSQLiteTimestamp(date: Date): number {
  return date.getTime();
}

/** Convert a SQLite integer timestamp back to a Date. */
export function fromSQLiteTimestamp(timestamp: number): Date {
  return new Date(timestamp);
}

/** Format a date in Spanish locale. */
export function formatDate(date: Date, locale = 'es-PY'): string {
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Generate a UUID v4. Uses crypto.randomUUID() when available, falls back to Math.random(). */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Basic email format validation. */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}
