/** Phase I — ERP expenses */
import { IS_DEMO_MODE, requireClient } from './_base';
import { loadStoredFarm, addExpense as storeAdd } from '@/lib/farm-store';

export type ExpenseCategory =
  | 'veterinary' | 'feed' | 'fuel' | 'labor'
  | 'infrastructure' | 'machinery' | 'transport' | 'taxes' | 'other';

export interface Expense {
  id:                 string;
  farmId:             string;
  date:               Date;
  category:           ExpenseCategory;
  description:        string;
  amount:             number;
  supplier:           string | null;
  appliedToHerdId:    string | null;
  appliedToPastureId: string | null;
  receiptUrl:         string | null;
  notes:              string | null;
}

export interface AddExpenseInput {
  date:               Date;
  category:           ExpenseCategory;
  description:        string;
  amount:             number;
  supplier?:          string;
  appliedToHerdId?:   string;
  appliedToPastureId?: string;
  notes?:             string;
}

export const expensesDb = {
  async list(_farmId: string, from?: Date, to?: Date): Promise<Expense[]> {
    if (IS_DEMO_MODE) {
      const farm = loadStoredFarm();
      let all = (farm?.expenses ?? []).map(normDate);
      if (from) all = all.filter((e) => e.date >= from);
      if (to)   all = all.filter((e) => e.date <= to);
      return all.sort((a, b) => b.date.getTime() - a.date.getTime());
    }
    const client = requireClient();
    let q = client.from('expenses').select('*').eq('farm_id', _farmId).order('date', { ascending: false });
    if (from) q = q.gte('date', from.toISOString().slice(0, 10));
    if (to)   q = q.lte('date', to.toISOString().slice(0, 10));
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async add(_farmId: string, input: AddExpenseInput): Promise<Expense> {
    if (IS_DEMO_MODE) {
      const exp = storeAdd(input);
      if (!exp) throw new Error('No se pudo guardar el gasto.');
      return normDate(exp);
    }
    const client = requireClient();
    const { data, error } = await client.from('expenses').insert({
      farm_id:                _farmId,
      date:                   input.date.toISOString().slice(0, 10),
      category:               input.category,
      description:            input.description,
      amount:                 input.amount,
      supplier:               input.supplier ?? null,
      applied_to_herd_id:     input.appliedToHerdId ?? null,
      applied_to_pasture_id:  input.appliedToPastureId ?? null,
      notes:                  input.notes ?? null,
    }).select().single();
    if (error) throw error;
    return mapRow(data);
  },

  /** Cost per head for a given farm + date range */
  async costPerHead(_farmId: string, from: Date, to: Date) {
    if (IS_DEMO_MODE) {
      const farm = loadStoredFarm();
      const all = (farm?.expenses ?? []).map(normDate).filter(
        (e) => e.date >= from && e.date <= to
      );
      const total = all.reduce((s, e) => s + e.amount, 0);
      return [{ total_cost: total, cost_per_head: null }];
    }
    const client = requireClient();
    const { data, error } = await client.rpc('cost_per_head', {
      p_farm_id:   _farmId,
      p_from_date: from.toISOString().slice(0, 10),
      p_to_date:   to.toISOString().slice(0, 10),
    });
    if (error) throw error;
    return data ?? [];
  },
};

function normDate(e: Expense): Expense {
  return { ...e, date: e.date instanceof Date ? e.date : new Date(e.date as unknown as string) };
}

function mapRow(r: Record<string, unknown>): Expense {
  return {
    id:                 r.id as string,
    farmId:             r.farm_id as string,
    date:               new Date(r.date as string),
    category:           r.category as ExpenseCategory,
    description:        r.description as string,
    amount:             Number(r.amount),
    supplier:           r.supplier as string | null,
    appliedToHerdId:    r.applied_to_herd_id as string | null,
    appliedToPastureId: r.applied_to_pasture_id as string | null,
    receiptUrl:         r.receipt_url as string | null,
    notes:              r.notes as string | null,
  };
}
