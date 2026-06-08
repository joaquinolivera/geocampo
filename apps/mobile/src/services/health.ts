/**
 * @fileoverview Health & Vaccination Service
 * Records veterinary treatments and queries upcoming due dates.
 */

import { PowerSyncDatabase } from '@powersync/react-native';

export type TreatmentType = 'vaccination' | 'deworming' | 'treatment' | 'checkup';

export interface HealthRecord {
  id: string;
  herd_id: string;
  treatment_type: TreatmentType;
  product_name: string | null;
  dosage: string | null;
  administered_by: string;
  administered_at: number; // ms timestamp
  next_due_date: number | null; // ms timestamp
  notes: string | null;
  created_at: number;
}

export interface RecordTreatmentInput {
  herdId: string;
  treatmentType: TreatmentType;
  productName?: string;
  dosage?: string;
  administeredBy: string;
  administeredAt?: Date;
  nextDueDate?: Date;
  notes?: string;
}

/**
 * Record a new health/treatment event for a herd.
 */
export async function recordTreatment(
  db: PowerSyncDatabase,
  input: RecordTreatmentInput
): Promise<HealthRecord> {
  const now = Date.now();
  const administeredAt = input.administeredAt?.getTime() ?? now;

  const record: HealthRecord = {
    id: crypto.randomUUID(),
    herd_id: input.herdId,
    treatment_type: input.treatmentType,
    product_name: input.productName ?? null,
    dosage: input.dosage ?? null,
    administered_by: input.administeredBy,
    administered_at: administeredAt,
    next_due_date: input.nextDueDate?.getTime() ?? null,
    notes: input.notes ?? null,
    created_at: now,
  };

  await db.execute(
    `INSERT INTO health (id, herd_id, treatment_type, product_name, dosage, administered_by, administered_at, next_due_date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.id,
      record.herd_id,
      record.treatment_type,
      record.product_name,
      record.dosage,
      record.administered_by,
      record.administered_at,
      record.next_due_date,
      record.notes,
      record.created_at,
    ]
  );

  return record;
}

/**
 * Fetch all health records for a given herd, ordered by date descending.
 */
export async function getHealthForHerd(
  db: PowerSyncDatabase,
  herdId: string
): Promise<HealthRecord[]> {
  return db.getAll<HealthRecord>(
    `SELECT * FROM health WHERE herd_id = ? ORDER BY administered_at DESC`,
    [herdId]
  );
}

/**
 * Fetch upcoming treatments with a next_due_date in the future (or overdue).
 * Returns records sorted by next_due_date ascending (most urgent first).
 * Pass limitDays to look ahead a set number of days (default: all upcoming).
 */
export async function getUpcomingTreatments(
  db: PowerSyncDatabase,
  limitDays?: number
): Promise<HealthRecord[]> {
  const cutoff = limitDays
    ? Date.now() + limitDays * 24 * 60 * 60 * 1000
    : Number.MAX_SAFE_INTEGER;

  return db.getAll<HealthRecord>(
    `SELECT * FROM health
     WHERE next_due_date IS NOT NULL
       AND next_due_date <= ?
     ORDER BY next_due_date ASC`,
    [cutoff]
  );
}

/**
 * Fetch overdue treatments (next_due_date in the past).
 */
export async function getOverdueTreatments(
  db: PowerSyncDatabase
): Promise<HealthRecord[]> {
  return db.getAll<HealthRecord>(
    `SELECT * FROM health
     WHERE next_due_date IS NOT NULL
       AND next_due_date < ?
     ORDER BY next_due_date ASC`,
    [Date.now()]
  );
}

/**
 * Human-readable label for treatment type.
 */
export function treatmentTypeLabel(type: TreatmentType): string {
  switch (type) {
    case 'vaccination':
      return 'Vacunación';
    case 'deworming':
      return 'Desparasitación';
    case 'treatment':
      return 'Tratamiento';
    case 'checkup':
      return 'Control veterinario';
  }
}

/**
 * Days until (or since) a due date. Negative = overdue.
 */
export function daysUntilDue(nextDueDateMs: number): number {
  const diffMs = nextDueDateMs - Date.now();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export type DueStatus = 'overdue' | 'urgent' | 'upcoming' | 'ok';

/**
 * Classify urgency of an upcoming treatment.
 * - overdue: past due
 * - urgent: due within 7 days
 * - upcoming: due within 30 days
 * - ok: more than 30 days out
 */
export function getDueStatus(nextDueDateMs: number): DueStatus {
  const days = daysUntilDue(nextDueDateMs);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'upcoming';
  return 'ok';
}

export function dueStatusColor(status: DueStatus): string {
  switch (status) {
    case 'overdue':
      return '#FF4444';
    case 'urgent':
      return '#FFB444';
    case 'upcoming':
      return '#DEFF9A';
    case 'ok':
      return '#6A6A6B';
  }
}
