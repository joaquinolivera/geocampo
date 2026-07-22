'use client';

/**
 * ERPPanel — Phase I
 * Full-height panel (replaces Sidebar) with Empleados / Combustible / Gastos / Maquinaria tabs.
 * All db calls go through the typed data-access layer (IS_DEMO_MODE routes to localStorage).
 */

import { useState, useEffect, useCallback } from 'react';
import { employeesDb, type Employee, type AddEmployeeInput } from '@/lib/db/employees';
import { fuelDb, type FuelLog, type AddFuelLogInput } from '@/lib/db/fuel';
import { expensesDb, type Expense, type AddExpenseInput, type ExpenseCategory } from '@/lib/db/expenses';
import { machineryDb, type Machine } from '@/lib/db/machinery';
import { useFarmData } from '@/lib/FarmDataContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type ErpTab = 'empleados' | 'combustible' | 'gastos' | 'maquinaria';

const ERP_TABS: { key: ErpTab; label: string; icon: string }[] = [
  { key: 'empleados',   label: 'Empleados',   icon: '👷' },
  { key: 'combustible', label: 'Combustible', icon: '⛽' },
  { key: 'gastos',      label: 'Gastos',      icon: '💸' },
  { key: 'maquinaria',  label: 'Maquinaria',  icon: '🚜' },
];

const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  veterinary:     'Veterinaria',
  feed:           'Alimentación',
  fuel:           'Combustible',
  labor:          'Mano de obra',
  infrastructure: 'Infraestructura',
  machinery:      'Maquinaria',
  transport:      'Transporte',
  taxes:          'Impuestos',
  other:          'Otro',
};

// ─── Modal helpers ────────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div
        className="w-full max-w-md rounded-2xl border border-surface2 flex flex-col shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#0A0A0B', maxHeight: '90vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface2 flex-shrink-0">
          <h2 className="text-white font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="text-muted hover:text-white transition-colors text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-muted uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-surface border border-surface2 rounded-xl px-4 py-2.5 text-white text-sm placeholder-muted focus:outline-none focus:border-lime transition-colors';

// ─── Add Employee Modal ───────────────────────────────────────────────────────

function AddEmployeeModal({ farmId, onClose, onSaved }: { farmId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true); setError(null);
    try {
      const input: AddEmployeeInput = {
        name: name.trim(),
        role: role.trim() || undefined,
        phone: phone.trim() || undefined,
        salaryMonthly: salary ? Number(salary) : undefined,
        idNumber: idNumber.trim() || undefined,
      };
      await employeesDb.add(farmId, input);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Agregar empleado" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre *"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Rodríguez" /></Field>
        <Field label="Rol / Cargo"><input className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} placeholder="Peón, capataz, veterinario…" /></Field>
        <Field label="Teléfono"><input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+595 981 000 000" /></Field>
        <Field label="Cédula / CUIL"><input className={inputCls} value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="1234567" /></Field>
        <Field label="Salario mensual (₲ / $)"><input className={inputCls} type="number" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0" min="0" /></Field>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm text-muted border border-surface2 hover:text-white transition-colors" style={{ backgroundColor: '#1A1A1B' }}>Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50" style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Add Fuel Modal ───────────────────────────────────────────────────────────

function AddFuelModal({ farmId, onClose, onSaved }: { farmId: string; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [liters, setLiters] = useState('');
  const [costPerLiter, setCostPerLiter] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!liters || Number(liters) <= 0) { setError('Los litros son obligatorios.'); return; }
    setSaving(true); setError(null);
    try {
      const input: AddFuelLogInput = {
        date: new Date(date + 'T12:00:00'),
        liters: Number(liters),
        costPerLiter: costPerLiter ? Number(costPerLiter) : undefined,
        vehicleEquipment: vehicle.trim() || undefined,
        purpose: purpose.trim() || undefined,
      };
      await fuelDb.add(farmId, input);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Registrar carga de combustible" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Fecha"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Litros *"><input className={inputCls} type="number" value={liters} onChange={(e) => setLiters(e.target.value)} placeholder="0" min="0" step="0.1" /></Field>
        <Field label="Costo por litro"><input className={inputCls} type="number" value={costPerLiter} onChange={(e) => setCostPerLiter(e.target.value)} placeholder="0" min="0" step="0.01" /></Field>
        <Field label="Vehículo / Equipo"><input className={inputCls} value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="Camioneta, tractor…" /></Field>
        <Field label="Propósito"><input className={inputCls} value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Traslado, laboreo…" /></Field>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm text-muted border border-surface2 hover:text-white transition-colors" style={{ backgroundColor: '#1A1A1B' }}>Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50" style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────

function AddExpenseModal({ farmId, onClose, onSaved }: { farmId: string; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [supplier, setSupplier] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { setError('La descripción es obligatoria.'); return; }
    if (!amount || Number(amount) <= 0) { setError('El monto es obligatorio.'); return; }
    setSaving(true); setError(null);
    try {
      const input: AddExpenseInput = {
        date: new Date(date + 'T12:00:00'),
        category,
        description: description.trim(),
        amount: Number(amount),
        supplier: supplier.trim() || undefined,
      };
      await expensesDb.add(farmId, input);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Registrar gasto" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Fecha"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Categoría">
          <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {(Object.entries(EXPENSE_CATEGORY_LABELS) as [ExpenseCategory, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
        <Field label="Descripción *"><input className={inputCls} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Vacuna aftosa, bolsa maíz…" /></Field>
        <Field label="Monto *"><input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="0" step="0.01" /></Field>
        <Field label="Proveedor"><input className={inputCls} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Nombre del proveedor" /></Field>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm text-muted border border-surface2 hover:text-white transition-colors" style={{ backgroundColor: '#1A1A1B' }}>Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50" style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── Add Machine Modal ────────────────────────────────────────────────────────

function AddMachineModal({ farmId, onClose, onSaved }: { farmId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true); setError(null);
    try {
      await machineryDb.add(farmId, {
        name: name.trim(),
        type: type.trim() || null,
        brand: brand.trim() || null,
        model: model.trim() || null,
        year: year ? Number(year) : null,
        purchaseDate: null,
        purchasePrice: null,
        status: 'active',
        notes: null,
      });
      onSaved();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Agregar maquinaria" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Nombre *"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tractor John Deere 6110J" /></Field>
        <Field label="Tipo"><input className={inputCls} value={type} onChange={(e) => setType(e.target.value)} placeholder="Tractor, cosechadora, pulverizadora…" /></Field>
        <Field label="Marca"><input className={inputCls} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="John Deere, New Holland…" /></Field>
        <Field label="Modelo"><input className={inputCls} value={model} onChange={(e) => setModel(e.target.value)} placeholder="6110J" /></Field>
        <Field label="Año"><input className={inputCls} type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2020" min="1900" max="2100" /></Field>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm text-muted border border-surface2 hover:text-white transition-colors" style={{ backgroundColor: '#1A1A1B' }}>Cancelar</button>
          <button type="submit" disabled={saving} className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all disabled:opacity-50" style={{ backgroundColor: '#DEFF9A', color: '#0A0A0B' }}>{saving ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </form>
    </ModalShell>
  );
}

// ─── ERP Panel ────────────────────────────────────────────────────────────────

interface ERPPanelProps {
  onClose: () => void;
}

export default function ERPPanel({ onClose }: ERPPanelProps) {
  const { isCustomFarm } = useFarmData();
  // Use a stable demo farmId for localStorage mode
  const farmId = 'demo';

  const [tab, setTab] = useState<ErpTab>('empleados');

  // Entity lists
  const [employees, setEmployees]   = useState<Employee[]>([]);
  const [fuelLogs, setFuelLogs]     = useState<FuelLog[]>([]);
  const [expenses, setExpenses]     = useState<Expense[]>([]);
  const [machinery, setMachinery]   = useState<Machine[]>([]);
  const [loading, setLoading]       = useState(false);

  // Modals
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showAddFuel,     setShowAddFuel]     = useState(false);
  const [showAddExpense,  setShowAddExpense]  = useState(false);
  const [showAddMachine,  setShowAddMachine]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, fuel, exp, mach] = await Promise.all([
        employeesDb.list(farmId),
        fuelDb.list(farmId),
        expensesDb.list(farmId),
        machineryDb.list(farmId),
      ]);
      setEmployees(emps);
      setFuelLogs(fuel);
      setExpenses(exp);
      setMachinery(mach);
    } catch (_) {
      // silently ignore network errors in demo
    } finally {
      setLoading(false);
    }
  }, [farmId]);

  useEffect(() => { load(); }, [load]);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalFuel = fuelLogs.reduce((s, f) => s + f.liters, 0);
  const totalFuelCost = fuelLogs.reduce((s, f) => s + (f.totalCost ?? 0), 0);

  return (
    <aside className="w-80 flex-shrink-0 flex flex-col border-r border-surface2 overflow-hidden bg-charcoal">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface2 flex-shrink-0">
        <span className="text-white font-bold text-sm">🏢 ERP</span>
        <button onClick={onClose} className="text-muted hover:text-white transition-colors text-lg leading-none">×</button>
      </div>

      {/* Sub-tab bar */}
      <div className="flex border-b border-surface2 flex-shrink-0 overflow-x-auto">
        {ERP_TABS.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap px-1"
            style={{
              color: tab === key ? '#DEFF9A' : '#6A6A6B',
              borderBottom: tab === key ? '2px solid #DEFF9A' : '2px solid transparent',
            }}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-3">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* ── EMPLEADOS ── */}
        {!loading && tab === 'empleados' && (
          <>
            {employees.length === 0 ? (
              <p className="text-muted text-sm text-center italic py-4">Sin empleados registrados</p>
            ) : (
              employees.map((emp) => (
                <div key={emp.id} className="bg-surface rounded-xl px-4 py-3 border border-surface2">
                  <p className="text-white font-semibold text-sm">{emp.name}</p>
                  {emp.role && <p className="text-muted text-xs mt-0.5">{emp.role}</p>}
                  <div className="flex gap-3 mt-1.5 text-xs text-muted">
                    {emp.phone && <span>📞 {emp.phone}</span>}
                    {emp.salaryMonthly && <span>💰 {emp.salaryMonthly.toLocaleString('es-PY')}/mes</span>}
                  </div>
                </div>
              ))
            )}
            {isCustomFarm && (
              <button
                onClick={() => setShowAddEmployee(true)}
                className="w-full rounded-xl py-2.5 text-sm font-medium transition-all border border-dashed border-surface2 hover:border-lime-300 hover:text-lime-300 text-muted"
                style={{ backgroundColor: 'transparent' }}
              >
                + Agregar empleado
              </button>
            )}
          </>
        )}

        {/* ── COMBUSTIBLE ── */}
        {!loading && tab === 'combustible' && (
          <>
            {totalFuel > 0 && (
              <div className="bg-surface rounded-xl px-4 py-3 border border-surface2 flex justify-between items-center mb-2">
                <span className="text-muted text-sm">Total registrado</span>
                <div className="text-right">
                  <p className="text-white font-bold">{totalFuel.toLocaleString('es-PY', { maximumFractionDigits: 1 })} L</p>
                  {totalFuelCost > 0 && <p className="text-muted text-xs">{totalFuelCost.toLocaleString('es-PY', { style: 'currency', currency: 'PYG', maximumFractionDigits: 0 })}</p>}
                </div>
              </div>
            )}
            {fuelLogs.length === 0 ? (
              <p className="text-muted text-sm text-center italic py-4">Sin cargas registradas</p>
            ) : (
              fuelLogs.map((f) => (
                <div key={f.id} className="bg-surface rounded-xl px-4 py-3 border border-surface2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-semibold text-sm">{f.liters.toLocaleString('es-PY', { maximumFractionDigits: 1 })} L</p>
                      {f.vehicleEquipment && <p className="text-muted text-xs">{f.vehicleEquipment}</p>}
                      {f.purpose && <p className="text-muted text-xs">{f.purpose}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-muted text-xs">{(f.date instanceof Date ? f.date : new Date(f.date)).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</p>
                      {f.totalCost != null && <p className="text-lime text-xs font-medium">{f.totalCost.toLocaleString('es-PY', { maximumFractionDigits: 0 })}</p>}
                    </div>
                  </div>
                </div>
              ))
            )}
            {isCustomFarm && (
              <button
                onClick={() => setShowAddFuel(true)}
                className="w-full rounded-xl py-2.5 text-sm font-medium transition-all border border-dashed border-surface2 hover:border-lime-300 hover:text-lime-300 text-muted"
                style={{ backgroundColor: 'transparent' }}
              >
                + Registrar carga
              </button>
            )}
          </>
        )}

        {/* ── GASTOS ── */}
        {!loading && tab === 'gastos' && (
          <>
            {totalExpenses > 0 && (
              <div className="bg-surface rounded-xl px-4 py-3 border border-surface2 flex justify-between items-center mb-2">
                <span className="text-muted text-sm">Total gastos</span>
                <p className="text-white font-bold">{totalExpenses.toLocaleString('es-PY', { maximumFractionDigits: 0 })}</p>
              </div>
            )}
            {expenses.length === 0 ? (
              <p className="text-muted text-sm text-center italic py-4">Sin gastos registrados</p>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="bg-surface rounded-xl px-4 py-3 border border-surface2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{exp.description}</p>
                      <p className="text-muted text-xs">{EXPENSE_CATEGORY_LABELS[exp.category]}{exp.supplier ? ` · ${exp.supplier}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-white font-bold text-sm">{exp.amount.toLocaleString('es-PY', { maximumFractionDigits: 0 })}</p>
                      <p className="text-muted text-xs">{(exp.date instanceof Date ? exp.date : new Date(exp.date)).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
            {isCustomFarm && (
              <button
                onClick={() => setShowAddExpense(true)}
                className="w-full rounded-xl py-2.5 text-sm font-medium transition-all border border-dashed border-surface2 hover:border-lime-300 hover:text-lime-300 text-muted"
                style={{ backgroundColor: 'transparent' }}
              >
                + Registrar gasto
              </button>
            )}
          </>
        )}

        {/* ── MAQUINARIA ── */}
        {!loading && tab === 'maquinaria' && (
          <>
            {machinery.length === 0 ? (
              <p className="text-muted text-sm text-center italic py-4">Sin maquinaria registrada</p>
            ) : (
              machinery.map((m) => (
                <div key={m.id} className="bg-surface rounded-xl px-4 py-3 border border-surface2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{m.name}</p>
                      {(m.brand || m.model) && <p className="text-muted text-xs">{[m.brand, m.model].filter(Boolean).join(' ')}</p>}
                      {m.type && <p className="text-muted text-xs">{m.type}</p>}
                    </div>
                    <span
                      className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-lg"
                      style={{
                        backgroundColor: m.status === 'active' ? '#DEFF9A22' : m.status === 'maintenance' ? '#FFB44422' : '#FF444422',
                        color: m.status === 'active' ? '#DEFF9A' : m.status === 'maintenance' ? '#FFB444' : '#FF6B6B',
                      }}
                    >
                      {m.status === 'active' ? 'Activo' : m.status === 'maintenance' ? 'Mantenimiento' : 'Retirado'}
                    </span>
                  </div>
                  {m.year && <p className="text-muted text-[10px] mt-1">Año {m.year}</p>}
                </div>
              ))
            )}
            {isCustomFarm && (
              <button
                onClick={() => setShowAddMachine(true)}
                className="w-full rounded-xl py-2.5 text-sm font-medium transition-all border border-dashed border-surface2 hover:border-lime-300 hover:text-lime-300 text-muted"
                style={{ backgroundColor: 'transparent' }}
              >
                + Agregar maquinaria
              </button>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showAddEmployee && (
        <AddEmployeeModal
          farmId={farmId}
          onClose={() => setShowAddEmployee(false)}
          onSaved={() => { setShowAddEmployee(false); load(); }}
        />
      )}
      {showAddFuel && (
        <AddFuelModal
          farmId={farmId}
          onClose={() => setShowAddFuel(false)}
          onSaved={() => { setShowAddFuel(false); load(); }}
        />
      )}
      {showAddExpense && (
        <AddExpenseModal
          farmId={farmId}
          onClose={() => setShowAddExpense(false)}
          onSaved={() => { setShowAddExpense(false); load(); }}
        />
      )}
      {showAddMachine && (
        <AddMachineModal
          farmId={farmId}
          onClose={() => setShowAddMachine(false)}
          onSaved={() => { setShowAddMachine(false); load(); }}
        />
      )}
    </aside>
  );
}
