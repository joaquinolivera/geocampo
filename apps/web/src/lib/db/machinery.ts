/** Phase I — ERP machinery & maintenance */
import { IS_DEMO_MODE, requireClient } from './_base';

export interface Machine {
  id:            string;
  farmId:        string;
  name:          string;
  type:          string | null;
  brand:         string | null;
  model:         string | null;
  year:          number | null;
  purchaseDate:  Date | null;
  purchasePrice: number | null;
  status:        'active' | 'maintenance' | 'retired';
  notes:         string | null;
}

export interface Maintenance {
  id:              string;
  farmId:          string;
  machineryId:     string;
  date:            Date;
  description:     string;
  cost:            number | null;
  performedBy:     string | null;
  nextServiceDate: Date | null;
  notes:           string | null;
}

export const machineryDb = {
  async list(farmId: string): Promise<Machine[]> {
    if (IS_DEMO_MODE) return [];
    const client = requireClient();
    const { data, error } = await client
      .from('machinery').select('*').eq('farm_id', farmId).order('name');
    if (error) throw error;
    return (data ?? []).map(mapMachine);
  },

  async listMaintenance(farmId: string, machineryId?: string): Promise<Maintenance[]> {
    if (IS_DEMO_MODE) return [];
    const client = requireClient();
    let q = client.from('machinery_maintenance').select('*').eq('farm_id', farmId).order('date', { ascending: false });
    if (machineryId) q = q.eq('machinery_id', machineryId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapMaintenance);
  },

  async add(farmId: string, input: Omit<Machine, 'id' | 'farmId'>): Promise<Machine> {
    if (IS_DEMO_MODE) throw new Error('ERP requires a Supabase connection.');
    const client = requireClient();
    const { data, error } = await client.from('machinery').insert({
      farm_id:       farmId,
      name:          input.name,
      type:          input.type ?? null,
      brand:         input.brand ?? null,
      model:         input.model ?? null,
      year:          input.year ?? null,
      purchase_date: input.purchaseDate?.toISOString().slice(0, 10) ?? null,
      purchase_price: input.purchasePrice ?? null,
      status:        input.status ?? 'active',
      notes:         input.notes ?? null,
    }).select().single();
    if (error) throw error;
    return mapMachine(data);
  },

  async addMaintenance(farmId: string, input: Omit<Maintenance, 'id' | 'farmId'>): Promise<Maintenance> {
    if (IS_DEMO_MODE) throw new Error('ERP requires a Supabase connection.');
    const client = requireClient();
    const { data, error } = await client.from('machinery_maintenance').insert({
      farm_id:           farmId,
      machinery_id:      input.machineryId,
      date:              input.date.toISOString().slice(0, 10),
      description:       input.description,
      cost:              input.cost ?? null,
      performed_by:      input.performedBy ?? null,
      next_service_date: input.nextServiceDate?.toISOString().slice(0, 10) ?? null,
      notes:             input.notes ?? null,
    }).select().single();
    if (error) throw error;
    return mapMaintenance(data);
  },
};

function mapMachine(r: Record<string, unknown>): Machine {
  return {
    id:            r.id as string,
    farmId:        r.farm_id as string,
    name:          r.name as string,
    type:          r.type as string | null,
    brand:         r.brand as string | null,
    model:         r.model as string | null,
    year:          r.year != null ? Number(r.year) : null,
    purchaseDate:  r.purchase_date ? new Date(r.purchase_date as string) : null,
    purchasePrice: r.purchase_price != null ? Number(r.purchase_price) : null,
    status:        r.status as Machine['status'],
    notes:         r.notes as string | null,
  };
}

function mapMaintenance(r: Record<string, unknown>): Maintenance {
  return {
    id:              r.id as string,
    farmId:          r.farm_id as string,
    machineryId:     r.machinery_id as string,
    date:            new Date(r.date as string),
    description:     r.description as string,
    cost:            r.cost != null ? Number(r.cost) : null,
    performedBy:     r.performed_by as string | null,
    nextServiceDate: r.next_service_date ? new Date(r.next_service_date as string) : null,
    notes:           r.notes as string | null,
  };
}
