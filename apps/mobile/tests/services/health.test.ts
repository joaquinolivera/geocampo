/**
 * @fileoverview Health Service Tests
 */

import {
  recordTreatment,
  getHealthForHerd,
  getUpcomingTreatments,
  getOverdueTreatments,
  treatmentTypeLabel,
  daysUntilDue,
  getDueStatus,
  dueStatusColor,
} from '@/services/health';

const mockExecute = jest.fn().mockResolvedValue(undefined);
const mockGetAll = jest.fn().mockResolvedValue([]);

const mockDb = {
  execute: mockExecute,
  getAll: mockGetAll,
} as any;

describe('Health Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('recordTreatment', () => {
    it('inserts a health record', async () => {
      await recordTreatment(mockDb, {
        herdId: 'herd-1',
        treatmentType: 'vaccination',
        productName: 'Clostrisan',
        dosage: '2ml',
        administeredBy: 'Dr. García',
      });

      expect(mockExecute).toHaveBeenCalledTimes(1);
      const [sql, params] = mockExecute.mock.calls[0];
      expect(sql).toContain('INSERT INTO health');
      expect(params).toContain('herd-1');
      expect(params).toContain('vaccination');
      expect(params).toContain('Clostrisan');
      expect(params).toContain('Dr. García');
    });

    it('returns the inserted record', async () => {
      const record = await recordTreatment(mockDb, {
        herdId: 'herd-1',
        treatmentType: 'deworming',
        administeredBy: 'system',
      });

      expect(record.herd_id).toBe('herd-1');
      expect(record.treatment_type).toBe('deworming');
      expect(record.id).toBeTruthy();
    });

    it('stores next_due_date as timestamp when provided', async () => {
      const dueDate = new Date('2026-08-01');
      await recordTreatment(mockDb, {
        herdId: 'herd-1',
        treatmentType: 'vaccination',
        administeredBy: 'Dr. García',
        nextDueDate: dueDate,
      });

      const params = mockExecute.mock.calls[0][1];
      expect(params).toContain(dueDate.getTime());
    });

    it('stores null next_due_date when not provided', async () => {
      await recordTreatment(mockDb, {
        herdId: 'herd-1',
        treatmentType: 'checkup',
        administeredBy: 'Dr. García',
      });

      const params = mockExecute.mock.calls[0][1];
      expect(params).toContain(null);
    });
  });

  describe('getHealthForHerd', () => {
    it('queries health ordered by date descending', async () => {
      await getHealthForHerd(mockDb, 'herd-2');

      const [sql, params] = mockGetAll.mock.calls[0];
      expect(sql).toContain('WHERE herd_id = ?');
      expect(sql).toContain('ORDER BY administered_at DESC');
      expect(params).toContain('herd-2');
    });
  });

  describe('getUpcomingTreatments', () => {
    it('queries treatments with next_due_date in the future', async () => {
      await getUpcomingTreatments(mockDb, 30);

      const [sql] = mockGetAll.mock.calls[0];
      expect(sql).toContain('next_due_date IS NOT NULL');
      expect(sql).toContain('ORDER BY next_due_date ASC');
    });
  });

  describe('getOverdueTreatments', () => {
    it('queries treatments past due', async () => {
      await getOverdueTreatments(mockDb);

      const [sql, params] = mockGetAll.mock.calls[0];
      expect(sql).toContain('next_due_date < ?');
      expect(typeof params[0]).toBe('number'); // current timestamp
    });
  });

  describe('treatmentTypeLabel', () => {
    it('returns Spanish labels for all types', () => {
      expect(treatmentTypeLabel('vaccination')).toBe('Vacunación');
      expect(treatmentTypeLabel('deworming')).toBe('Desparasitación');
      expect(treatmentTypeLabel('treatment')).toBe('Tratamiento');
      expect(treatmentTypeLabel('checkup')).toBe('Control veterinario');
    });
  });

  describe('daysUntilDue', () => {
    it('returns positive days for future dates', () => {
      const future = Date.now() + 5 * 24 * 60 * 60 * 1000;
      expect(daysUntilDue(future)).toBe(5);
    });

    it('returns negative days for past dates', () => {
      const past = Date.now() - 3 * 24 * 60 * 60 * 1000;
      expect(daysUntilDue(past)).toBe(-3);
    });
  });

  describe('getDueStatus', () => {
    it('returns overdue for past dates', () => {
      const past = Date.now() - 2 * 24 * 60 * 60 * 1000;
      expect(getDueStatus(past)).toBe('overdue');
    });

    it('returns urgent for next 7 days', () => {
      const soon = Date.now() + 5 * 24 * 60 * 60 * 1000;
      expect(getDueStatus(soon)).toBe('urgent');
    });

    it('returns upcoming for 8-30 days', () => {
      const later = Date.now() + 14 * 24 * 60 * 60 * 1000;
      expect(getDueStatus(later)).toBe('upcoming');
    });

    it('returns ok for 30+ days', () => {
      const far = Date.now() + 60 * 24 * 60 * 60 * 1000;
      expect(getDueStatus(far)).toBe('ok');
    });
  });

  describe('dueStatusColor', () => {
    it('returns correct colors', () => {
      expect(dueStatusColor('overdue')).toBe('#FF4444');
      expect(dueStatusColor('urgent')).toBe('#FFB444');
      expect(dueStatusColor('upcoming')).toBe('#DEFF9A');
      expect(dueStatusColor('ok')).toBe('#6A6A6B');
    });
  });
});
