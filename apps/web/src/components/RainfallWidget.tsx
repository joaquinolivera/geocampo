'use client';

/**
 * RainfallWidget — logs manual rainfall readings for a pasture or farm-wide.
 * Shown in ParcelDetailPanel. Also used standalone on the ERP / mercado page.
 *
 * DB table: rainfall_log (from migration 011)
 */

import { useEffect, useState, useTransition } from 'react';
import { getBrowserClient } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';

interface RainfallEntry {
  id:    string;
  date:  string;
  mm:    number;
  notes: string | null;
}

interface Props {
  /** When provided, entries are scoped to this pasture. Null = farm-wide. */
  pastureId?: string | null;
  /** Show compact (no chart, 3 rows max) vs full view */
  compact?: boolean;
}

export default function RainfallWidget({ pastureId = null, compact = false }: Props) {
  const { farmId } = useFarmData();
  const [entries,   setEntries]   = useState<RainfallEntry[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [isPending, startTrans]   = useTransition();

  const [date,  setDate]  = useState(() => new Date().toISOString().slice(0, 10));
  const [mm,    setMm]    = useState('');
  const [notes, setNotes] = useState('');

  async function load() {
    const client = getBrowserClient();
    if (!client || !farmId) { setLoading(false); return; }
    let q = client
      .from('rainfall_log')
      .select('id, date, mm, notes')
      .eq('farm_id', farmId)
      .order('date', { ascending: false })
      .limit(compact ? 5 : 30);

    if (pastureId) {
      q = q.eq('pasture_id', pastureId);
    } else {
      q = q.is('pasture_id', null);
    }

    const { data } = await q;
    setEntries((data ?? []) as RainfallEntry[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, [farmId, pastureId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    const mmVal = parseFloat(mm);
    if (!date || isNaN(mmVal) || mmVal < 0) return;
    startTrans(() => { void (async () => {
      const client = getBrowserClient();
      if (!client || !farmId) return;
      await client.from('rainfall_log').insert({
        farm_id:     farmId,
        pasture_id:  pastureId ?? null,
        date,
        mm:          mmVal,
        notes:       notes.trim() || null,
      });
      setShowForm(false);
      setMm(''); setNotes(''); setDate(new Date().toISOString().slice(0, 10));
      await load();
    })(); });
  };

  const handleDelete = (id: string) => {
    startTrans(() => { void (async () => {
      const client = getBrowserClient();
      if (!client) return;
      await client.from('rainfall_log').delete().eq('id', id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    })(); });
  };

  // Totals
  const totalMm   = entries.reduce((s, e) => s + e.mm, 0);
  const last30Days = entries.filter((e) => {
    const diff = (Date.now() - new Date(e.date).getTime()) / 86_400_000;
    return diff <= 30;
  }).reduce((s, e) => s + e.mm, 0);

  const inputCls = 'w-full rounded-xl border border-surface2 bg-charcoal px-3 py-2 text-white text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 transition-colors';

  return (
    <div className="space-y-3">
      {/* Summary strip */}
      {!compact && entries.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-surface2 px-4 py-3 text-center" style={{ backgroundColor: '#0A0A0B' }}>
            <p className="text-muted text-xs">Últimos 30 días</p>
            <p className="text-lime font-bold text-lg">{last30Days.toFixed(1)} mm</p>
          </div>
          <div className="rounded-xl border border-surface2 px-4 py-3 text-center" style={{ backgroundColor: '#0A0A0B' }}>
            <p className="text-muted text-xs">Total registrado</p>
            <p className="text-white font-bold text-lg">{totalMm.toFixed(1)} mm</p>
          </div>
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-surface2 py-2 text-muted text-xs hover:border-lime/30 hover:text-lime transition-colors"
        >
          💧 Registrar lluvia
        </button>
      )}

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-surface2 p-4 space-y-3" style={{ backgroundColor: '#111112' }}>
          <p className="text-white text-xs font-semibold">Nueva lectura</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-muted text-xs block mb-1">Fecha</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-muted text-xs block mb-1">Milímetros</label>
              <input
                type="number" min="0" step="0.1"
                value={mm} onChange={(e) => setMm(e.target.value)}
                placeholder="0.0"
                className={inputCls}
              />
            </div>
          </div>
          <input
            type="text" value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending || !mm || parseFloat(mm) < 0}
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

      {/* Entry list */}
      {loading ? (
        <p className="text-muted text-xs text-center py-2">Cargando…</p>
      ) : entries.length === 0 ? (
        <p className="text-muted text-xs text-center py-4">Sin registros de lluvia.</p>
      ) : (
        <div className="space-y-1.5">
          {(compact ? entries.slice(0, 3) : entries).map((e) => (
            <div
              key={e.id}
              className="rounded-xl border border-surface2 px-4 py-2.5 flex items-center gap-3"
              style={{ backgroundColor: '#0A0A0B' }}
            >
              <span className="text-lg">💧</span>
              <div className="flex-1 min-w-0">
                <span className="text-white text-sm font-medium">{e.mm} mm</span>
                <span className="text-muted text-xs ml-2">{e.date}</span>
                {e.notes && <p className="text-muted text-xs italic mt-0.5">{e.notes}</p>}
              </div>
              <button
                onClick={() => handleDelete(e.id)}
                className="text-muted hover:text-red-400 transition-colors text-xs shrink-0"
                title="Eliminar"
              >
                ✕
              </button>
            </div>
          ))}
          {compact && entries.length > 3 && (
            <p className="text-muted text-xs text-center">+{entries.length - 3} más</p>
          )}
        </div>
      )}
    </div>
  );
}
