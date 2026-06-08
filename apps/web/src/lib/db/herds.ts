import { IS_DEMO_MODE, requireClient } from './_base';
import { loadStoredFarm, addHerd, moveHerd } from '@/lib/farm-store';
import type { AddHerdInput } from '@/lib/farm-store';
import type { Herd } from '@/lib/data';

export const herdsDb = {
  async list(farmId: string): Promise<Herd[]> {
    if (IS_DEMO_MODE) {
      const farm = loadStoredFarm();
      return (farm?.herds ?? []).map(h => ({
        ...h,
        species: (h as { species?: string }).species as Herd['species'] ?? 'bovino',
        entryDate: typeof h.entryDate === 'string' ? new Date(h.entryDate) : h.entryDate,
      })) as unknown as Herd[];
    }
    const client = requireClient();
    const { data, error } = await client
      .from('herds')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async add(farmId: string, input: AddHerdInput) {
    if (IS_DEMO_MODE) return addHerd(input);
    const client = requireClient();
    const { data, error } = await client.from('herds').insert({
      farm_id:      farmId,
      pasture_id:   input.pastureId,
      name:         input.name,
      species:      input.species ?? 'bovino',
      breed:        input.breed,
      cattle_count: input.cattleCount,
      entry_date:   input.entryDate?.toISOString().slice(0, 10),
    }).select().single();
    if (error) throw error;
    return data;
  },

  async move(herdId: string, input: Parameters<typeof moveHerd>[1]) {
    if (IS_DEMO_MODE) return moveHerd(herdId, input);
    const client = requireClient();

    // Fetch current herd state before update
    const { data: herd } = await client.from('herds').select('farm_id, name, pasture_id').eq('id', herdId).single();
    const { data: toPasture } = await client.from('pastures').select('name').eq('id', input.toPastureId).single();

    // Update herd
    const { error: herdErr } = await client.from('herds').update({
      pasture_id: input.toPastureId,
      entry_date: input.movedAt?.toISOString().slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    }).eq('id', herdId);
    if (herdErr) throw herdErr;

    // Insert movement record
    const { error: movErr } = await client.from('movements').insert({
      farm_id:           herd?.farm_id,
      herd_id:           herdId,
      herd_name:         herd?.name ?? '',
      from_pasture_id:   herd?.pasture_id ?? null,
      from_pasture_name: null,
      to_pasture_id:     input.toPastureId,
      to_pasture_name:   toPasture?.name ?? '',
      moved_at:          (input.movedAt ?? new Date()).toISOString(),
      moved_by:          input.movedBy ?? null,
      notes:             input.notes ?? null,
    });
    if (movErr) throw movErr;
    return null;
  },
};

function mapRow(r: Record<string, unknown>): Herd {
  return {
    id:           r.id as string,
    name:         r.name as string,
    pastureId:    r.pasture_id as string,
    species:      (r.species ?? 'bovino') as Herd['species'],
    breed:        r.breed as string ?? '',
    cattleCount:  Number(r.cattle_count),
    status:       r.status as Herd['status'],
    entryDate:    r.entry_date ? new Date(r.entry_date as string) : new Date(),
    coordinate:   [Number(r.coord_lng ?? 0), Number(r.coord_lat ?? 0)],
  };
}
