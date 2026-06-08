import { IS_DEMO_MODE, requireClient } from './_base';
import { loadStoredFarm, addHealthRecord } from '@/lib/farm-store';
import type { HealthRecord } from '@/lib/data';

export const healthDb = {
  async list(farmId: string, herdId?: string): Promise<HealthRecord[]> {
    if (IS_DEMO_MODE) {
      const farm = loadStoredFarm();
      const all = (farm?.healthRecords ?? []).map(r => ({
        ...r,
        administeredAt: typeof r.administeredAt === 'string' ? new Date(r.administeredAt) : r.administeredAt,
        nextDueDate: r.nextDueDate
          ? (typeof r.nextDueDate === 'string' ? new Date(r.nextDueDate) : r.nextDueDate)
          : undefined,
      })) as unknown as HealthRecord[];
      return herdId ? all.filter(r => r.herdId === herdId) : all;
    }
    const client = requireClient();
    let q = client.from('health_records').select('*').eq('farm_id', farmId).order('administered_at', { ascending: false });
    if (herdId) q = q.eq('herd_id', herdId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async add(farmId: string, input: {
    herdId: string; treatmentType: HealthRecord['treatmentType'];
    productName?: string; dosage?: string; administeredAt: Date;
    administeredBy?: string; nextDueDate?: Date; notes?: string;
  }) {
    if (IS_DEMO_MODE) return addHealthRecord(input.herdId, {
      treatmentType: input.treatmentType as 'vaccination' | 'deworming' | 'treatment' | 'checkup',
      productName:    input.productName,
      dosage:         input.dosage,
      administeredBy: input.administeredBy ?? '',
      administeredAt: input.administeredAt,
      nextDueDate:    input.nextDueDate,
      notes:          input.notes,
    });
    const client = requireClient();
    const { data, error } = await client.from('health_records').insert({
      farm_id:         farmId,
      herd_id:         input.herdId,
      treatment_type:  input.treatmentType,
      product_name:    input.productName ?? null,
      dosage:          input.dosage ?? null,
      administered_at: input.administeredAt.toISOString(),
      administered_by: input.administeredBy ?? null,
      next_due_date:   input.nextDueDate?.toISOString().slice(0, 10) ?? null,
      notes:           input.notes ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  },
};

function mapRow(r: Record<string, unknown>): HealthRecord {
  return {
    id:              r.id as string,
    herdId:          r.herd_id as string,
    treatmentType:   r.treatment_type as HealthRecord['treatmentType'],
    productName:     r.product_name as string | null,
    dosage:          r.dosage as string | null,
    administeredAt:  new Date(r.administered_at as string),
    administeredBy:  (r.administered_by as string | null) ?? '',
    nextDueDate:     r.next_due_date ? new Date(r.next_due_date as string) : null,
    notes:           r.notes as string | null,
  };
}
