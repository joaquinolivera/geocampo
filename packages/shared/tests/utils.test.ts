/**
 * @fileoverview Phase 1 TDD: Shared Types Tests
 */

import { toSQLiteTimestamp, fromSQLiteTimestamp, formatDate, generateUUID, isValidEmail } from '../src/utils';

describe('Shared Utilities', () => {
  describe('Date Conversion', () => {
    it('should convert Date to SQLite timestamp', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const timestamp = toSQLiteTimestamp(date);
      expect(timestamp).toBe(date.getTime());
      expect(typeof timestamp).toBe('number');
    });

    it('should convert SQLite timestamp to Date', () => {
      const timestamp = 1705317000000;
      const date = fromSQLiteTimestamp(timestamp);
      expect(date).toBeInstanceOf(Date);
      expect(date.getTime()).toBe(timestamp);
    });

    it('should round-trip correctly', () => {
      const originalDate = new Date('2024-06-01T12:00:00.000Z');
      const timestamp = toSQLiteTimestamp(originalDate);
      const recoveredDate = fromSQLiteTimestamp(timestamp);
      expect(recoveredDate.getTime()).toBe(originalDate.getTime());
    });
  });

  describe('Date Formatting', () => {
    it('should format date in Spanish', () => {
      const date = new Date('2024-03-15');
      const formatted = formatDate(date);
      expect(formatted).toContain('marzo');
      expect(formatted).toContain('2024');
    });
  });

  describe('UUID Generation', () => {
    it('should generate valid UUID v4 format', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generateUUID();
      const uuid2 = generateUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('Email Validation', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });
  });
});
