/** Phase I — ERP employee management */
import { IS_DEMO_MODE, requireClient } from './_base';

export interface Employee {
  id:             string;
  farmId:         string;
  name:           string;
  role:           string | null;
  idNumber:       string | null;    // CUIL (AR) / cédula (PY)
  hireDate:       Date | null;
  salaryMonthly:  number | null;
  phone:          string | null;
  active:         boolean;
  notes:          string | null;
}

export interface AddEmployeeInput {
  name:           string;
  role?:          string;
  idNumber?:      string;
  hireDate?:      Date;
  salaryMonthly?: number;
  phone?:         string;
  notes?:         string;
}

export const employeesDb = {
  async list(farmId: string, activeOnly = true): Promise<Employee[]> {
    if (IS_DEMO_MODE) return [];
    const client = requireClient();
    let q = client.from('employees').select('*').eq('farm_id', farmId).order('name');
    if (activeOnly) q = q.eq('active', true);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async add(farmId: string, input: AddEmployeeInput): Promise<Employee> {
    if (IS_DEMO_MODE) throw new Error('ERP requires a Supabase connection.');
    const client = requireClient();
    const { data, error } = await client.from('employees').insert({
      farm_id:        farmId,
      name:           input.name,
      role:           input.role ?? null,
      id_number:      input.idNumber ?? null,
      hire_date:      input.hireDate?.toISOString().slice(0, 10) ?? null,
      salary_monthly: input.salaryMonthly ?? null,
      phone:          input.phone ?? null,
      notes:          input.notes ?? null,
    }).select().single();
    if (error) throw error;
    return mapRow(data);
  },

  async deactivate(employeeId: string): Promise<void> {
    if (IS_DEMO_MODE) throw new Error('ERP requires a Supabase connection.');
    const client = requireClient();
    const { error } = await client.from('employees').update({ active: false }).eq('id', employeeId);
    if (error) throw error;
  },
};

function mapRow(r: Record<string, unknown>): Employee {
  return {
    id:            r.id as string,
    farmId:        r.farm_id as string,
    name:          r.name as string,
    role:          r.role as string | null,
    idNumber:      r.id_number as string | null,
    hireDate:      r.hire_date ? new Date(r.hire_date as string) : null,
    salaryMonthly: r.salary_monthly != null ? Number(r.salary_monthly) : null,
    phone:         r.phone as string | null,
    active:        Boolean(r.active),
    notes:         r.notes as string | null,
  };
}
