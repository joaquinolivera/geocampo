import { IS_DEMO_MODE, requireClient } from './_base';
import { loadStoredFarm } from '@/lib/farm-store';
import type { Movement } from '@/lib/data';

export const movementsDb = {
  async list(farmId: string): Promise<Movement[]> {
    if (IS_DEMO_MODE) {
      const farm = loadStoredFarm();
      return (farm?.movements ?? []).map(m => ({
        ...m,
        movedAt: typeof m.movedAt === 'string' ? new Date(m.movedAt) : m.movedAt,
      })) as unknown as Movement[];
    }
    const client = requireClient();
    const { data, error } = await client
      .from('movements')
      .select('*')
      .eq('farm_id', farmId)
      .order('moved_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },
};

function mapRow(r: Record<string, unknown>): Movement {
  return {
    id:               r.id as string,
    herdId:           r.herd_id as string,
    herdName:         r.herd_name as string,
    fromPastureId:    r.from_pasture_id as string | null | undefined,
    fromPastureName:  r.from_pasture_name as string | null,
    toPastureId:      r.to_pasture_id as string | undefined,
    toPastureName:    (r.to_pasture_name as string | null) ?? '',
    movedAt:          new Date(r.moved_at as string),
    movedBy:          (r.moved_by as string | null) ?? '',
    notes:            r.notes as string | null | undefined,
  };
}
