/** Phase I — ERP employee management */
import { IS_DEMO_MODE, requireClient } from './_base';
import { loadStoredFarm, addEmployee as storeAddEmployee } from '@/lib/farm-store';

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
  async list(_farmId: string, activeOnly = true): Promise<Employee[]> {
    if (IS_DEMO_MODE) {
      const farm = loadStoredFarm();
      const all = (farm?.employees ?? []).map(normalizeDates);
      return activeOnly ? all.filter((e) => e.active) : all;
    }
    const client = requireClient();
    let q = client.from('employees').select('*').eq('farm_id', _farmId).order('name');
    if (activeOnly) q = q.eq('active', true);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async add(_farmId: string, input: AddEmployeeInput): Promise<Employee> {
    if (IS_DEMO_MODE) {
      const emp = storeAddEmployee(input);
      if (!emp) throw new Error('No se pudo guardar el empleado.');
      return normalizeDates(emp);
    }
    const client = requireClient();
    const { data, error } = await client.from('employees').insert({
      farm_id:        _farmId,
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
    if (IS_DEMO_MODE) {
      const farm = loadStoredFarm();
      if (farm) {
        farm.employees = (farm.employees ?? []).map((e) =>
          e.id === employeeId ? { ...e, active: false } : e
        );
        const { saveStoredFarm } = await import('@/lib/farm-store');
        saveStoredFarm(farm);
      }
      return;
    }
    const client = requireClient();
    const { error } = await client.from('employees').update({ active: false }).eq('id', employeeId);
    if (error) throw error;
  },
};

function normalizeDates(e: Employee): Employee {
  return {
    ...e,
    hireDate: e.hireDate ? (e.hireDate instanceof Date ? e.hireDate : new Date(e.hireDate as unknown as string)) : null,
  };
}

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
