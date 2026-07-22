'use client';

/**
 * GrazingLogPanel — shows rotation history for a pasture + form to log a period.
 * Embedded inside ParcelDetailPanel as a collapsible section.
 */

import { useEffect, useState, useTransition } from 'react';
import { getBrowserClient } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';

interface GrazingEntry {
  id:         string;
  herd_name:  string;
  start_date: string;
  end_date:   string | null;
  notes:      string | null;
}

interface Props {
  pastureId: string;
}

export default function GrazingLogPanel({ pastureId }: Props) {
  const { farmId, HERDS } = useFarmData();
  const [entries,   setEntries]   = useState<GrazingEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [isPending, startTrans]   = useTransition();

  // Form state
  const [herdId,    setHerdId]    = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate,   setEndDate]   = useState('');
  const [notes,     setNotes]     = useState('');

  async function load() {
    const client = getBrowserClient();
    if (!client || !farmId) { setLoading(false); return; }
    const { data } = await client
      .from('grazing_log')
      .select('id, herd_name, start_date, end_date, notes')
      .eq('pasture_id', pastureId)
      .order('start_date', { ascending: false })
      .limit(20);
    setEntries((data ?? []) as GrazingEntry[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [pastureId, farmId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    if (!startDate) return;
    const herd = HERDS.find((h) => h.id === herdId);
    startTrans(() => { void (async () => {
      const client = getBrowserClient();
      if (!client || !farmId) return;
      await client.from('grazing_log').insert({
        farm_id:    farmId,
        pasture_id: pastureId,
        herd_id:    herdId || null,
        herd_name:  herd?.name ?? 'Sin rodeo',
        start_date: startDate,
        end_date:   endDate || null,
        notes:      notes || null,
      });
      setShowForm(false);
      setHerdId(''); setStartDate(new Date().toISOString().slice(0, 10)); setEndDate(''); setNotes('');
      await load();
    })(); });
  };

  const handleDelete = (id: string) => {
    startTrans(() => { void (async () => {
      const client = getBrowserClient();
      if (!client) return;
      await client.from('grazing_log').delete().eq('id', id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    })(); });
  };

  const inputCls = 'w-full rounded-xl border border-surface2 bg-charcoal px-3 py-2 text-white text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 transition-colors';

  return (
    <div className="space-y-3">
      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-surface2 py-2 text-muted text-xs hover:border-lime/30 hover:text-lime transition-colors"
        >
          + Registrar período de pastoreo
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-surface2 p-4 space-y-3" style={{ backgroundColor: '#111112' }}>
          <p className="text-white text-xs font-semibold">Nuevo período</p>

          {HERDS.length > 0 && (
            <select value={herdId} onChange={(e) => setHerdId(e.target.value)} className={inputCls}>
              <option value="">— Sin rodeo —</option>
              {HERDS.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-muted text-xs block mb-1">Inicio</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-muted text-xs block mb-1">Fin (vacío = activo)</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          <input
            type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            className={inputCls}
          />

          <div className="flex gap-2">
            <button
              onClick={handleSave} disabled={isPending || !startDate}
              className="flex-1 rounded-xl py-2 text-charcoal text-xs font-bold disabled:opacity-50 hover:brightness-110 transition-all"
              style={{ backgroundColor: '#DEFF9A' }}
            >
              {isPending ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-xl px-4 py-2 text-muted text-xs border border-surface2 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Log list */}
      {loading ? (
        <p className="text-muted text-xs text-center py-2">Cargando…</p>
      ) : entries.length === 0 ? (
        <p className="text-muted text-xs text-center py-4">Sin historial registrado.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => {
            const start = e.start_date;
            const end   = e.end_date;
            const days  = end
              ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000)
              : null;
            return (
              <div
                key={e.id}
                className="rounded-xl border border-surface2 px-4 py-3 flex items-start gap-3"
                style={{ backgroundColor: '#0A0A0B' }}
              >
                <div className="text-lg">{end ? '🔄' : '🟢'}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{e.herd_name}</p>
                  <p className="text-muted text-xs mt-0.5">
                    {start} → {end ?? 'hoy'}
                    {days !== null && <span className="ml-2 text-lime/60">({days}d)</span>}
                  </p>
                  {e.notes && <p className="text-muted text-xs mt-0.5 italic">{e.notes}</p>}
                </div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-muted hover:text-red-400 transition-colors text-xs shrink-0"
                  title="Eliminar"
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
