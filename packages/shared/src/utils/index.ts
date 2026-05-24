/**
 * @fileoverview Shared Utilities
 */

/**
 * Convert a Date to SQLite timestamp (milliseconds since epoch)
 */
export function toSQLiteTimestamp(date: Date): number {
  return date.getTime();
}

/**
 * Convert SQLite timestamp (milliseconds) to Date
 */
export function fromSQLiteTimestamp(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate UUID v4 (simple version for client-side)
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
