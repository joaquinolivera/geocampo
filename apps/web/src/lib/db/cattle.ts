/**
 * Phase G — Individual cattle / DIOB chip tracking.
 * Demo mode: no localStorage equivalent yet — returns empty arrays.
 */
import { IS_DEMO_MODE, requireClient } from './_base';

export interface CattleRecord {
  id:           string;
  farmId:       string;
  herdId:       string | null;
  chipId:       string | null;    // ISO 11784/11785 FDX-B EID
  visualTagId:  string | null;
  sex:          'male' | 'female' | 'castrated' | null;
  breed:        string | null;
  dob:          Date | null;
  status:       'active' | 'sold' | 'deceased' | 'transferred';
  notes:        string | null;
}

export interface AddCattleInput {
  herdId:      string;
  chipId?:     string;
  visualTagId?: string;
  sex?:        CattleRecord['sex'];
  breed?:      string;
  dob?:        Date;
  notes?:      string;
}

export const cattleDb = {
  async list(farmId: string, herdId?: string): Promise<CattleRecord[]> {
    if (IS_DEMO_MODE) return [];
    const client = requireClient();
    let q = client.from('cattle').select('*').eq('farm_id', farmId).order('created_at');
    if (herdId) q = q.eq('herd_id', herdId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async add(farmId: string, input: AddCattleInput): Promise<CattleRecord> {
    if (IS_DEMO_MODE) throw new Error('Cattle tracking requires a Supabase connection.');
    const client = requireClient();
    const { data, error } = await client.from('cattle').insert({
      farm_id:      farmId,
      herd_id:      input.herdId,
      chip_id:      input.chipId ?? null,
      visual_tag_id: input.visualTagId ?? null,
      sex:          input.sex ?? null,
      breed:        input.breed ?? null,
      dob:          input.dob?.toISOString().slice(0, 10) ?? null,
      notes:        input.notes ?? null,
    }).select().single();
    if (error) throw error;
    return mapRow(data);
  },

  async findByChip(farmId: string, chipId: string): Promise<CattleRecord | null> {
    if (IS_DEMO_MODE) return null;
    const client = requireClient();
    const { data } = await client
      .from('cattle')
      .select('*')
      .eq('farm_id', farmId)
      .eq('chip_id', chipId)
      .single();
    return data ? mapRow(data) : null;
  },
};

function mapRow(r: Record<string, unknown>): CattleRecord {
  return {
    id:          r.id as string,
    farmId:      r.farm_id as string,
    herdId:      r.herd_id as string | null,
    chipId:      r.chip_id as string | null,
    visualTagId: r.visual_tag_id as string | null,
    sex:         r.sex as CattleRecord['sex'],
    breed:       r.breed as string | null,
    dob:         r.dob ? new Date(r.dob as string) : null,
    status:      r.status as CattleRecord['status'],
    notes:       r.notes as string | null,
  };
}
