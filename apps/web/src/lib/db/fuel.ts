/** Phase I — ERP fuel logs */
import { IS_DEMO_MODE, requireClient } from './_base';
import { loadStoredFarm, addFuelLog as storeAdd } from '@/lib/farm-store';

export interface FuelLog {
  id:               string;
  farmId:           string;
  date:             Date;
  liters:           number;
  costPerLiter:     number | null;
  totalCost:        number | null;
  vehicleEquipment: string | null;
  purpose:          string | null;
  odometerKm:       number | null;
  notes:            string | null;
}

export interface AddFuelLogInput {
  date:              Date;
  liters:            number;
  costPerLiter?:     number;
  vehicleEquipment?: string;
  purpose?:          string;
  odometerKm?:       number;
  notes?:            string;
}

export const fuelDb = {
  async list(farmId: string, from?: Date, to?: Date): Promise<FuelLog[]> {
    if (IS_DEMO_MODE) {
      const farm = loadStoredFarm();
      let all = (farm?.fuelLogs ?? []).map(normDate);
      if (from) all = all.filter((f) => f.date >= from);
      if (to)   all = all.filter((f) => f.date <= to);
      return all.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    const client = requireClient();
    let q = client.from('fuel_logs').select('*').eq('farm_id', farmId).order('date', { ascending: false });
    if (from) q = q.gte('date', from.toISOString().slice(0, 10));
    if (to)   q = q.lte('date', to.toISOString().slice(0, 10));
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async add(farmId: string, input: AddFuelLogInput): Promise<FuelLog> {
    if (IS_DEMO_MODE) {
      const log = storeAdd(input);
      if (!log) throw new Error('No se pudo guardar el registro.');
      return normDate(log);
    }
    const client = requireClient();
    const total = input.costPerLiter != null ? input.liters * input.costPerLiter : null;
    const { data, error } = await client.from('fuel_logs').insert({
      farm_id:           farmId,
      date:              input.date.toISOString().slice(0, 10),
      liters:            input.liters,
      cost_per_liter:    input.costPerLiter ?? null,
      total_cost:        total,
      vehicle_equipment: input.vehicleEquipment ?? null,
      purpose:           input.purpose ?? null,
      odometer_km:       input.odometerKm ?? null,
      notes:             input.notes ?? null,
    }).select().single();
    if (error) throw error;
    return mapRow(data);
  },
};

function normDate(f: FuelLog): FuelLog {
  return { ...f, date: f.date instanceof Date ? f.date : new Date(f.date as unknown as string) };
}

function mapRow(r: Record<string, unknown>): FuelLog {
  return {
    id:               r.id as string,
    farmId:           r.farm_id as string,
    date:             new Date(r.date as string),
    liters:           Number(r.liters),
    costPerLiter:     r.cost_per_liter != null ? Number(r.cost_per_liter) : null,
    totalCost:        r.total_cost != null ? Number(r.total_cost) : null,
    vehicleEquipment: r.vehicle_equipment as string | null,
    purpose:          r.purpose as string | null,
    odometerKm:       r.odometer_km != null ? Number(r.odometer_km) : null,
    notes:            r.notes as string | null,
  };
}
