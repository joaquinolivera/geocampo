import { IS_DEMO_MODE, requireClient } from './_base';
import { loadStoredFarm, addPasture, updatePasture, removePasture } from '@/lib/farm-store';
import type { AddPastureInput, UpdatePastureInput } from '@/lib/farm-store';
import type { Pasture } from '@/lib/data';

export const pasturesDb = {
  /** List all pastures for a farm */
  async list(farmId: string): Promise<Pasture[]> {
    if (IS_DEMO_MODE) {
      const farm = loadStoredFarm();
      return (farm?.pastures ?? []) as unknown as Pasture[];
    }
    const client = requireClient();
    const { data, error } = await client
      .from('pastures')
      .select('*')
      .eq('farm_id', farmId)
      .order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  /** Add a new pasture */
  async add(farmId: string, input: AddPastureInput) {
    if (IS_DEMO_MODE) return addPasture(input);
    const client = requireClient();
    const { data, error } = await client.from('pastures').insert({
      farm_id:           farmId,
      name:              input.name,
      coordinates:       input.coordinates,
      area_hectares:     input.coordinates ? undefined : null, // calculated server-side
      carrying_capacity: input.carryingCapacity,
      grass_type:        input.grassType ?? null,
      water_supply:      input.waterSupply ?? null,
      notes:             input.notes ?? null,
    }).select().single();
    if (error) throw error;
    return data;
  },

  /** Update pasture metadata */
  async update(pastureId: string, input: UpdatePastureInput) {
    if (IS_DEMO_MODE) return updatePasture(pastureId, input);
    const client = requireClient();
    const { data, error } = await client.from('pastures').update({
      ...(input.name              !== undefined && { name:              input.name }),
      ...(input.carryingCapacity  !== undefined && { carrying_capacity: input.carryingCapacity }),
      ...(input.grassType         !== undefined && { grass_type:        input.grassType }),
      ...(input.waterSupply       !== undefined && { water_supply:      input.waterSupply }),
      ...(input.notes             !== undefined && { notes:             input.notes }),
      ...(input.coordinates       !== undefined && { coordinates:       input.coordinates }),
    }).eq('id', pastureId).select().single();
    if (error) throw error;
    return data;
  },

  /** Remove a pasture (blocked if it has an active herd) */
  async remove(pastureId: string) {
    if (IS_DEMO_MODE) return removePasture(pastureId);
    const client = requireClient();
    // Check for active herds first
    const { count } = await client
      .from('herds')
      .select('id', { count: 'exact', head: true })
      .eq('pasture_id', pastureId)
      .eq('status', 'active');
    if ((count ?? 0) > 0) return { error: 'has_herd' as const };
    const { error } = await client.from('pastures').delete().eq('id', pastureId);
    if (error) throw error;
    return { farm: null }; // caller refreshes
  },
};

function mapRow(r: Record<string, unknown>): Pasture {
  return {
    id:               r.id as string,
    name:             r.name as string,
    geometry: {
      type: 'Polygon' as const,
      coordinates: r.coordinates as [number, number][][],
    },
    areaHectares:     Number(r.area_hectares ?? 0),
    carryingCapacity: Number(r.carrying_capacity ?? 0),
    grassType:        r.grass_type as Pasture['grassType'],
    waterSupply:      r.water_supply as Pasture['waterSupply'],
    elevationM:       r.elevation_m != null ? Number(r.elevation_m) : (undefined as unknown as number),
    color:            (r.color as string | null) ?? '#DEFF9A',
    notes:            (r.notes as string | null) ?? undefined,
  };
}
