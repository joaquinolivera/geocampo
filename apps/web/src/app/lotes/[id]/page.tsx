'use client';

/**
 * /lotes/[id] — Lote detail page
 *
 * - P&L summary (ADG, ROI, result)
 * - Cost log (gastos)
 * - Add cost event
 * - Close lote (record sale)
 */

import { useEffect, useState, useTransition, use } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';
import { useCanDo } from '@/components/RoleGate';

interface LotePnl {
  id: string;
  nombre: string;
  descripcion: string | null;
  estado: 'abierto' | 'cerrado' | 'cancelado';
  fecha_entrada: string;
  fecha_salida: string | null;
  cabezas_entrada: number;
  cabezas_salida: number | null;
  peso_entrada_kg: number | null;
  peso_salida_kg: number | null;
  dias_engorde: number | null;
  costo_entrada: number;
  ingreso_venta: number | null;
  total_gastos: number;
  costo_total: number;
  resultado_neto: number | null;
  resultado_por_cabeza: number | null;
  adg_kg_dia: number | null;
  roi_pct: number | null;
  moneda: string;
  herd_id: string | null;
}

interface Gasto {
  id: string;
  fecha: string;
  categoria: string;
  descripcion: string | null;
  monto: number;
  moneda: string;
}

const CATEGORIA_LABELS: Record<string, string> = {
  sanidad:         '💉 Sanidad',
  alimentacion:    '🌾 Alimentación',
  mano_de_obra:    '👷 Mano de obra',
  flete:           '🚛 Flete',
  impuesto:        '📋 Impuesto',
  infraestructura: '🏗️ Infraestructura',
  otro:            '📦 Otro',
};

const inputCls = 'w-full rounded-xl border border-surface2 bg-surface px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 transition-colors';

function fmt(n: number | null | undefined, currency: string) {
  if (n == null) return '—';
  return `${currency} ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function LoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { farmId, HERDS, PASTURES, farmSlug } = useFarmData();
  const { canEditHerds, canViewFinancials, canAddRecords } = useCanDo();

  const [lote,     setLote]    = useState<LotePnl | null>(null);
  const [gastos,   setGastos]  = useState<Gasto[]>([]);
  const [loading,  setLoading] = useState(true);

  // Gasto form
  const [gFecha,     setGFecha]    = useState(new Date().toISOString().slice(0, 10));
  const [gCat,       setGCat]      = useState('sanidad');
  const [gDesc,      setGDesc]     = useState('');
  const [gMonto,     setGMonto]    = useState('');
  const [gError,     setGError]    = useState<string | null>(null);
  const [isPendingG, startG]       = useTransition();

  // Close form
  const [showClose,   setShowClose]   = useState(false);
  const [cFecha,      setCFecha]      = useState(new Date().toISOString().slice(0, 10));
  const [cCabezas,    setCCabezas]    = useState('');
  const [cPeso,       setCPeso]       = useState('');
  const [cIngreso,    setCIngreso]    = useState('');
  const [cError,      setCError]      = useState<string | null>(null);
  const [isPendingC,  startC]         = useTransition();

  const loadData = async () => {
    const client = getBrowserClient();
    if (!client) { setLoading(false); return; }

    const [loteRes, gastosRes, herdLinkRes] = await Promise.all([
      client.from('lote_pnl').select('*').eq('id', id).maybeSingle(),
      client.from('gastos_lote').select('id, fecha, categoria, descripcion, monto, moneda')
        .eq('lote_id', id).order('fecha', { ascending: false }),
      client.from('lotes_comerciales').select('herd_id').eq('id', id).maybeSingle(),
    ]);

    const pnl = loteRes.data as LotePnl | null;
    if (pnl) {
      pnl.herd_id = (herdLinkRes.data as { herd_id: string | null } | null)?.herd_id ?? null;
    }
    setLote(pnl);
    setGastos((gastosRes.data ?? []) as Gasto[]);
    setLoading(false);
  };

  useEffect(() => { void loadData(); }, [id]);

  const handleAddGasto = (e: React.FormEvent) => {
    e.preventDefault();
    setGError(null);
    if (!gMonto || parseFloat(gMonto) <= 0) { setGError('Monto inválido.'); return; }

    startG(() => { void (async () => {
      const client = getBrowserClient();
      if (!client || !farmId || !lote) return;

      const { error } = await client.from('gastos_lote').insert({
        lote_id:     id,
        farm_id:     farmId,
        fecha:       gFecha,
        categoria:   gCat,
        descripcion: gDesc.trim() || null,
        monto:       parseFloat(gMonto),
        moneda:      lote.moneda,
      });

      if (error) { setGError(error.message); return; }

      setGMonto('');
      setGDesc('');
      await loadData();
    })(); });
  };

  const handleCloseLote = (e: React.FormEvent) => {
    e.preventDefault();
    setCError(null);
    if (!cCabezas || !cIngreso) { setCError('Cabezas e ingreso son obligatorios.'); return; }

    startC(() => { void (async () => {
      const client = getBrowserClient();
      if (!client || !lote) return;

      const { error } = await client.from('lotes_comerciales').update({
        fecha_salida:   cFecha,
        cabezas_salida: parseInt(cCabezas, 10),
        peso_salida_kg: cPeso ? parseFloat(cPeso) : null,
        ingreso_venta:  parseFloat(cIngreso),
        estado:         'cerrado',
      }).eq('id', id);

      if (error) { setCError(error.message); return; }

      setShowClose(false);
      await loadData();
    })(); });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lote) {
    return (
      <div className="min-h-screen bg-charcoal flex flex-col items-center justify-center gap-4 text-white">
        <p className="text-muted">Lote no encontrado.</p>
        <Link href="/lotes" className="text-lime text-sm hover:underline">← Volver a lotes</Link>
      </div>
    );
  }

  const isOpen = lote.estado === 'abierto';

  return (
    <div className="min-h-screen bg-charcoal text-white">
      {/* Header */}
      <div className="border-b border-surface2 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/lotes" className="text-muted hover:text-white transition-colors text-sm">← Lotes</Link>
          <div>
            <h1 className="text-lg font-bold">{lote.nombre}</h1>
            {lote.descripcion && <p className="text-muted text-xs">{lote.descripcion}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
            lote.estado === 'abierto' ? 'bg-lime/20 text-lime' :
            lote.estado === 'cerrado' ? 'bg-blue-500/20 text-blue-300' : 'bg-surface2 text-muted'
          }`}>
            {lote.estado}
          </span>
          {isOpen && canEditHerds && (
            <button
              onClick={() => setShowClose(true)}
              className="rounded-xl px-4 py-2 text-sm font-bold border border-blue-500/40 text-blue-300 hover:bg-blue-500/10 transition-colors"
            >
              Cerrar lote
            </button>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* P&L summary */}
        {canViewFinancials && (
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Resumen económico</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Costo total"    value={fmt(lote.costo_total, lote.moneda)} />
              <StatCard label="Ingreso venta"  value={fmt(lote.ingreso_venta, lote.moneda)} />
              <StatCard
                label="Resultado neto"
                value={fmt(lote.resultado_neto, lote.moneda)}
                color={lote.resultado_neto == null ? undefined : lote.resultado_neto >= 0 ? 'text-lime' : 'text-red-400'}
              />
              <StatCard
                label="ROI"
                value={lote.roi_pct != null ? `${lote.roi_pct}%` : '—'}
                color={lote.roi_pct == null ? undefined : lote.roi_pct >= 0 ? 'text-lime' : 'text-red-400'}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
              <StatCard label="Cabezas entrada" value={String(lote.cabezas_entrada)} />
              <StatCard label="Cabezas salida"  value={lote.cabezas_salida != null ? String(lote.cabezas_salida) : '—'} />
              <StatCard label="Días engorde"    value={lote.dias_engorde != null ? `${lote.dias_engorde} días` : '—'} />
              <StatCard label="ADG"             value={lote.adg_kg_dia != null ? `${lote.adg_kg_dia.toFixed(3)} kg/día` : '—'} />
            </div>
          </section>
        )}

        {/* Linked herd */}
        {(() => {
          const linkedHerd = lote.herd_id ? HERDS.find((h) => h.id === lote.herd_id) : null;
          if (!linkedHerd) return null;
          const pasture = linkedHerd.pastureId ? PASTURES.find((p) => p.id === linkedHerd.pastureId) : null;
          const pastureHref = farmSlug && pasture ? `/${farmSlug}/${pasture.id}` : null;
          return (
            <section>
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Rodeo vinculado</h2>
              <div
                className="rounded-2xl border border-surface2 px-5 py-4 flex items-center gap-4"
                style={{ backgroundColor: '#111112' }}
              >
                <span className="text-2xl">🐄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm">{linkedHerd.name}</p>
                  <p className="text-muted text-xs mt-0.5">
                    {linkedHerd.cattleCount} cabezas
                    {linkedHerd.breed ? ` · ${linkedHerd.breed}` : ''}
                    {pasture ? ` · Potrero: ${pasture.name}` : ''}
                  </p>
                </div>
                {pastureHref && (
                  <a
                    href={pastureHref}
                    className="text-lime text-xs hover:brightness-110 transition-colors shrink-0"
                  >
                    Ver potrero →
                  </a>
                )}
              </div>
            </section>
          );
        })()}

        {/* Add gasto */}
        {isOpen && canAddRecords && (
          <section>
            <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Registrar gasto</h2>
            <form
              onSubmit={handleAddGasto}
              className="rounded-2xl border border-surface2 p-5 space-y-4"
              style={{ backgroundColor: '#111112' }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-xs font-medium mb-2">Fecha</label>
                  <input type="date" value={gFecha} onChange={(e) => setGFecha(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-white text-xs font-medium mb-2">Categoría</label>
                  <select value={gCat} onChange={(e) => setGCat(e.target.value)} className={inputCls}>
                    {Object.entries(CATEGORIA_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-xs font-medium mb-2">Descripción</label>
                  <input type="text" value={gDesc} onChange={(e) => setGDesc(e.target.value)} placeholder="Opcional" className={inputCls} />
                </div>
                <div>
                  <label className="block text-white text-xs font-medium mb-2">Monto ({lote.moneda})</label>
                  <input type="number" step="0.01" min="0" value={gMonto} onChange={(e) => setGMonto(e.target.value)} placeholder="0.00" className={inputCls} />
                </div>
              </div>
              {gError && <p className="text-red-400 text-xs">{gError}</p>}
              <button
                type="submit"
                disabled={isPendingG}
                className="rounded-xl px-5 py-2 text-sm font-bold text-charcoal disabled:opacity-50 hover:brightness-110 transition-all"
                style={{ backgroundColor: '#DEFF9A' }}
              >
                {isPendingG ? 'Guardando…' : 'Agregar gasto'}
              </button>
            </form>
          </section>
        )}

        {/* Gastos log */}
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
            Gastos ({gastos.length}) — Total: {fmt(lote.total_gastos, lote.moneda)}
          </h2>
          {gastos.length === 0 ? (
            <p className="text-muted text-sm text-center py-8">Sin gastos registrados.</p>
          ) : (
            <div className="space-y-2">
              {gastos.map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-xl border border-surface2 px-4 py-3"
                  style={{ backgroundColor: '#111112' }}
                >
                  <div>
                    <p className="text-white text-sm">{CATEGORIA_LABELS[g.categoria] ?? g.categoria}</p>
                    {g.descripcion && <p className="text-muted text-xs">{g.descripcion}</p>}
                    <p className="text-muted text-xs">{new Date(g.fecha).toLocaleDateString('es-AR')}</p>
                  </div>
                  <p className="text-white font-semibold text-sm shrink-0">{fmt(g.monto, g.moneda)}</p>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>

      {/* Close lote modal */}
      {showClose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-surface2 p-6" style={{ backgroundColor: '#111112' }}>
            <h3 className="text-white font-bold text-lg mb-5">Cerrar lote — registrar venta</h3>
            <form onSubmit={handleCloseLote} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-xs font-medium mb-2">Fecha salida</label>
                  <input type="date" value={cFecha} onChange={(e) => setCFecha(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-white text-xs font-medium mb-2">Cabezas salida *</label>
                  <input type="number" min="1" value={cCabezas} onChange={(e) => setCCabezas(e.target.value)} placeholder={String(lote.cabezas_entrada)} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-white text-xs font-medium mb-2">Peso salida (kg)</label>
                  <input type="number" step="0.1" min="0" value={cPeso} onChange={(e) => setCPeso(e.target.value)} placeholder="310" className={inputCls} />
                </div>
                <div>
                  <label className="block text-white text-xs font-medium mb-2">Ingreso venta ({lote.moneda}) *</label>
                  <input type="number" step="0.01" min="0" value={cIngreso} onChange={(e) => setCIngreso(e.target.value)} placeholder="0.00" className={inputCls} />
                </div>
              </div>
              {cError && <p className="text-red-400 text-xs">{cError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClose(false)}
                  className="flex-1 rounded-xl py-2.5 text-sm font-medium border border-surface2 text-muted hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPendingC}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold text-charcoal disabled:opacity-50 hover:brightness-110 transition-all"
                  style={{ backgroundColor: '#DEFF9A' }}
                >
                  {isPendingC ? 'Cerrando…' : 'Confirmar venta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl border border-surface2 px-4 py-3" style={{ backgroundColor: '#111112' }}>
      <p className="text-muted text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-white font-bold text-sm ${color ?? ''}`}>{value}</p>
    </div>
  );
}
