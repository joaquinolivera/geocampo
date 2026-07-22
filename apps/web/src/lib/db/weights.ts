import { IS_DEMO_MODE, requireClient } from './_base';
import { loadStoredFarm, addWeightRecord } from '@/lib/farm-store';
import type { WeightRecord } from '@/lib/data';

export const weightsDb = {
  async list(farmId: string, herdId?: string): Promise<WeightRecord[]> {
    if (IS_DEMO_MODE) {
      const farm = loadStoredFarm();
      const all = (farm?.weightRecords ?? []).map(w => ({
        ...w,
        weighedAt: typeof w.weighedAt === 'string' ? new Date(w.weighedAt) : w.weighedAt,
      })) as unknown as WeightRecord[];
      return herdId ? all.filter(w => w.herdId === herdId) : all;
    }
    const client = requireClient();
    let q = client.from('weight_records').select('*').eq('farm_id', farmId).order('weighed_at', { ascending: false });
    if (herdId) q = q.eq('herd_id', herdId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async add(farmId: string, input: {
    herdId: string; cattleCount: number; averageWeightKg: number;
    weighedAt: Date; weighedBy?: string; notes?: string;
  }) {
    if (IS_DEMO_MODE) return addWeightRecord(input.herdId, {
      cattleCount: input.cattleCount,
      averageWeightKg: input.averageWeightKg,
      weighedAt: input.weighedAt,
      weighedBy: input.weighedBy ?? '',
      notes: input.notes,
    });
    const client = requireClient();
    const { data, error } = await client.from('weight_records').insert({
      farm_id:           farmId,
      herd_id:           input.herdId,
      cattle_count:      input.cattleCount,
      average_weight_kg: input.averageWeightKg,
      weighed_at:        input.weighedAt.toISOString(),
      weighed_by:        input.weighedBy ?? null,
      notes:             input.notes ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  },
};

function mapRow(r: Record<string, unknown>): WeightRecord {
  return {
    id:               r.id as string,
    herdId:           r.herd_id as string,
    cattleCount:      Number(r.cattle_count),
    averageWeightKg:  Number(r.average_weight_kg),
    weighedAt:        new Date(r.weighed_at as string),
    weighedBy:        (r.weighed_by as string | null) ?? '',
    weightKg:         Number(r.cattle_count) * Number(r.average_weight_kg),
    notes:            (r.notes as string | null),
  };
}
