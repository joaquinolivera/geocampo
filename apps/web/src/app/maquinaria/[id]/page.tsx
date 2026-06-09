'use client';

/**
 * /maquinaria/[id] — Machine detail
 * Uses: machinery_depreciation view, fuel_logs, machinery_maintenance
 */

import { useEffect, useState, useTransition, use } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';
import { useCanDo } from '@/components/RoleGate';

interface MachineView {
  id: string;
  nombre: string;
  tipo: string | null;
  marca: string | null;
  modelo: string | null;
  año: number | null;
  patente: string | null;
  estado: string;
  horometro_actual: number;
  valor_compra: number | null;
  fecha_compra: string | null;
  vida_util_años: number;
  notas: string | null;
  depreciacion_anual: number | null;
  valor_libro: number | null;
}

interface FuelLog {
  id: string;
  fecha: string;
  litros: number;
  costo_total: number | null;
  moneda: string;
  horometro: number | null;
}

interface Maintenance {
  id: string;
  tipo: string | null;
  description: string;
  date: string | null;
  next_service_date: string | null;
  cost: number | null;
  completado: boolean | null;
}

const inputCls = 'w-full rounded-xl border border-surface2 bg-surface px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 transition-colors';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface2 px-4 py-3" style={{ backgroundColor: '#111112' }}>
      <p className="text-muted text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-white font-bold text-sm">{value}</p>
    </div>
  );
}

export default function MachineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { farmId } = useFarmData();
  const { canAddRecords, canEditHerds } = useCanDo();

  const [machine, setMachine] = useState<MachineView | null>(null);
  const [fuels,   setFuels]   = useState<FuelLog[]>([]);
  const [maints,  setMaints]  = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(true);

  // Fuel form
  const [fFecha,  setFFecha]  = useState(new Date().toISOString().slice(0, 10));
  const [fLitros, setFLitros] = useState('');
  const [fCosto,  setFCosto]  = useState('');
  const [fError,  setFError]  = useState<string | null>(null);
  const [isPendF, startF]     = useTransition();

  // Maint form
  const [mTipo,  setMTipo]  = useState('preventivo');
  const [mDesc,  setMDesc]  = useState('');
  const [mFecha, setMFecha] = useState('');
  const [mProx,  setMProx]  = useState('');
  const [mCosto, setMCosto] = useState('');
  const [mError, setMError] = useState<string | null>(null);
  const [isPendM, startM]   = useTransition();

  const loadData = async () => {
    const client = getBrowserClient();
    if (!client) { setLoading(false); return; }

    const [mRes, fRes, maRes] = await Promise.all([
      client.from('machinery_depreciation').select('*').eq('id', id).maybeSingle(),
      client.from('fuel_logs').select('id,fecha,litros,costo_total,moneda,horometro')
        .eq('machinery_id', id).order('fecha', { ascending: false }).limit(50),
      client.from('machinery_maintenance')
        .select('id,tipo,description,date,next_service_date,cost,completado')
        .eq('machinery_id', id)
        .order('created_at', { ascending: false }),
    ]);

    setMachine(mRes.data as MachineView | null);
    setFuels((fRes.data ?? []) as FuelLog[]);
    setMaints((maRes.data ?? []) as Maintenance[]);
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [id]);

  const handleAddFuel = (e: React.FormEvent) => {
    e.preventDefault();
    setFError(null);
    if (!fLitros || parseFloat(fLitros) <= 0) { setFError('Litros inválido.'); return; }

    startF(() => { void (async () => {
      const client = getBrowserClient();
      if (!client || !farmId) return;

      const { error } = await client.from('fuel_logs').insert({
        machinery_id: id, farm_id: farmId,
        fecha: fFecha, litros: parseFloat(fLitros),
        costo_total: fCosto ? parseFloat(fCosto) : null, moneda: 'ARS',
      });

      if (error) { setFError(error.message); return; }
      setFLitros(''); setFCosto('');
      await loadData();
    })(); });
  };

  const handleAddMaint = (e: React.FormEvent) => {
    e.preventDefault();
    setMError(null);
    if (!mDesc.trim()) { setMError('Descripción requerida.'); return; }

    startM(() => { void (async () => {
      const client = getBrowserClient();
      if (!client || !farmId) return;

      const { error } = await client.from('machinery_maintenance').insert({
        machinery_id: id, farm_id: farmId,
        tipo: mTipo, description: mDesc.trim(),
        date: mFecha || null, next_service_date: mProx || null,
        cost: mCosto ? parseFloat(mCosto) : null,
      });

      if (error) { setMError(error.message); return; }
      setMDesc(''); setMFecha(''); setMProx(''); setMCosto('');
      await loadData();
    })(); });
  };

  const toggleComplete = (maintId: string, current: boolean) => {
    void (async () => {
      const client = getBrowserClient();
      if (!client) return;
      await client.from('machinery_maintenance').update({ completado: !current }).eq('id', maintId);
      await loadData();
    })();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!machine) {
    return (
      <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-muted">Máquina no encontrada.</p>
        <Link href="/maquinaria" className="text-lime text-sm hover:underline">← Volver</Link>
      </div>
    );
  }

  const totalFuelCost = fuels.reduce((s, f) => s + (f.costo_total ?? 0), 0);

  return (
    <div className="min-h-screen bg-charcoal text-white">
      <div className="border-b border-surface2 px-6 py-4 flex items-center gap-4">
        <Link href="/maquinaria" className="text-muted hover:text-white text-sm">← Maquinaria</Link>
        <div>
          <h1 className="text-lg font-bold">{machine.nombre}</h1>
          <p className="text-muted text-xs">
            {[machine.marca, machine.modelo, machine.año].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Horómetro"        value={`${machine.horometro_actual.toLocaleString('es-AR')} hs`} />
          <StatCard label="Valor libro"      value={machine.valor_libro != null ? `ARS ${machine.valor_libro.toLocaleString('es-AR')}` : '—'} />
          <StatCard label="Deprec. anual"    value={machine.depreciacion_anual != null ? `ARS ${machine.depreciacion_anual.toLocaleString('es-AR')}` : '—'} />
          <StatCard label="Combustible total" value={`ARS ${totalFuelCost.toLocaleString('es-AR')}`} />
        </div>

        {/* Fuel */}
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Combustible</h2>
          {canAddRecords && (
            <form onSubmit={handleAddFuel} className="rounded-2xl border border-surface2 p-4 mb-4 space-y-3" style={{ backgroundColor: '#111112' }}>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-white text-xs font-medium mb-1.5">Fecha</label>
                  <input type="date" value={fFecha} onChange={(e) => setFFecha(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-white text-xs font-medium mb-1.5">Litros</label>
                  <input type="number" step="0.1" min="0" value={fLitros} onChange={(e) => setFLitros(e.target.value)} placeholder="50" className={inputCls} />
                </div>
                <div>
                  <label className="block text-white text-xs font-medium mb-1.5">Costo (ARS)</label>
                  <input type="number" step="0.01" min="0" value={fCosto} onChange={(e) => setFCosto(e.target.value)} placeholder="0.00" className={inputCls} />
                </div>
              </div>
              {fError && <p className="text-red-400 text-xs">{fError}</p>}
              <button type="submit" disabled={isPendF} className="rounded-xl px-4 py-2 text-sm font-bold text-charcoal disabled:opacity-50 hover:brightness-110 transition-all" style={{ backgroundColor: '#DEFF9A' }}>
                {isPendF ? 'Guardando…' : 'Cargar combustible'}
              </button>
            </form>
          )}
          {fuels.length === 0 ? (
            <p className="text-muted text-sm text-center py-4">Sin cargas de combustible.</p>
          ) : (
            <div className="space-y-2">
              {fuels.slice(0, 10).map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-xl border border-surface2 px-4 py-2.5" style={{ backgroundColor: '#111112' }}>
                  <div>
                    <p className="text-white text-sm">{f.litros} L</p>
                    <p className="text-muted text-xs">{new Date(f.fecha).toLocaleDateString('es-AR')}</p>
                  </div>
                  {f.costo_total != null && (
                    <p className="text-muted text-sm">{f.moneda} {f.costo_total.toLocaleString('es-AR')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Maintenance */}
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Mantenimiento</h2>
          {canAddRecords && (
            <form onSubmit={handleAddMaint} className="rounded-2xl border border-surface2 p-4 mb-4 space-y-3" style={{ backgroundColor: '#111112' }}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white text-xs font-medium mb-1.5">Tipo</label>
                  <select value={mTipo} onChange={(e) => setMTipo(e.target.value)} className={inputCls}>
                    <option value="preventivo">Preventivo</option>
                    <option value="correctivo">Correctivo</option>
                    <option value="inspeccion">Inspección</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-white text-xs font-medium mb-1.5">Costo (ARS)</label>
                  <input type="number" step="0.01" min="0" value={mCosto} onChange={(e) => setMCosto(e.target.value)} placeholder="0.00" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-white text-xs font-medium mb-1.5">Descripción *</label>
                <input type="text" value={mDesc} onChange={(e) => setMDesc(e.target.value)} placeholder="Cambio de aceite…" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white text-xs font-medium mb-1.5">Fecha realizado</label>
                  <input type="date" value={mFecha} onChange={(e) => setMFecha(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-white text-xs font-medium mb-1.5">Próximo servicio</label>
                  <input type="date" value={mProx} onChange={(e) => setMProx(e.target.value)} className={inputCls} />
                </div>
              </div>
              {mError && <p className="text-red-400 text-xs">{mError}</p>}
              <button type="submit" disabled={isPendM} className="rounded-xl px-4 py-2 text-sm font-bold text-charcoal disabled:opacity-50 hover:brightness-110 transition-all" style={{ backgroundColor: '#DEFF9A' }}>
                {isPendM ? 'Guardando…' : 'Agregar mantenimiento'}
              </button>
            </form>
          )}
          {maints.length === 0 ? (
            <p className="text-muted text-sm text-center py-4">Sin registros de mantenimiento.</p>
          ) : (
            <div className="space-y-2">
              {maints.map((m) => (
                <div key={m.id} className="flex items-start justify-between rounded-xl border border-surface2 px-4 py-3" style={{ backgroundColor: '#111112', opacity: m.completado ? 0.6 : 1 }}>
                  <div className="min-w-0">
                    <p className={`text-sm ${m.completado ? 'line-through text-muted' : 'text-white'}`}>{m.description}</p>
                    <p className="text-muted text-xs mt-0.5">
                      {m.tipo ?? 'preventivo'}
                      {m.date ? ` · ${new Date(m.date).toLocaleDateString('es-AR')}` : ''}
                      {m.next_service_date ? ` · próximo ${new Date(m.next_service_date).toLocaleDateString('es-AR')}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {m.cost != null && <span className="text-muted text-xs">ARS {m.cost.toLocaleString('es-AR')}</span>}
                    {canEditHerds && (
                      <button
                        onClick={() => toggleComplete(m.id, m.completado ?? false)}
                        className={`text-xs px-2 py-1 rounded-lg border transition-colors ${m.completado ? 'border-surface2 text-muted' : 'border-lime/40 text-lime hover:bg-lime/10'}`}
                      >
                        {m.completado ? 'Hecho' : 'Marcar hecho'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
