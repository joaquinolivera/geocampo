'use client';

/**
 * /movimientos — Herd movement log (full timeline)
 *
 * Groups all movements by month, shows which herd moved
 * where, with from/to pasture names and notes.
 * Data comes from FarmDataContext.MOVEMENTS (already loaded).
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useFarmData } from '@/lib/FarmDataContext';

export default function MovimientosPage() {
  const { MOVEMENTS, HERDS, farmSlug } = useFarmData();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return MOVEMENTS;
    return MOVEMENTS.filter(
      (m) =>
        m.herdName.toLowerCase().includes(q) ||
        (m.fromPastureName ?? '').toLowerCase().includes(q) ||
        m.toPastureName.toLowerCase().includes(q) ||
        (m.notes ?? '').toLowerCase().includes(q)
    );
  }, [MOVEMENTS, search]);

  // Group by year-month
  const grouped = useMemo(() => {
    const map = new Map<string, typeof MOVEMENTS>();
    for (const m of filtered) {
      const d = m.movedAt instanceof Date ? m.movedAt : new Date(m.movedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const backHref = farmSlug ? `/${farmSlug}` : '/';

  function monthLabel(key: string): string {
    const [y, m] = key.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  }

  return (
    <div className="min-h-screen bg-charcoal text-white">
      {/* Header */}
      <div className="border-b border-surface2 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={backHref} className="text-muted hover:text-white transition-colors text-sm">← Campo</Link>
          <h1 className="text-lg font-bold">↗ Movimientos de hacienda</h1>
        </div>
        <span className="text-muted text-sm">{MOVEMENTS.length} registros</span>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por rodeo, potrero o notas…"
          className="w-full rounded-xl border border-surface2 bg-surface px-4 py-3 text-white placeholder-muted text-sm focus:outline-none focus:border-lime/50 focus:ring-1 focus:ring-lime/30 transition-colors"
        />

        {grouped.length === 0 && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">↗</p>
            <p className="text-muted">
              {search ? 'Sin resultados para esa búsqueda.' : 'No hay movimientos registrados.'}
            </p>
          </div>
        )}

        {grouped.map(([monthKey, moves]) => (
          <section key={monthKey}>
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 capitalize">
              {monthLabel(monthKey)}
              <span className="ml-2 text-muted/50 normal-case font-normal">
                ({moves.length} movimiento{moves.length !== 1 ? 's' : ''})
              </span>
            </h2>

            {/* Timeline */}
            <div className="relative pl-6 space-y-0">
              {/* Vertical line */}
              <div className="absolute left-2.5 top-2 bottom-2 w-px bg-surface2" />

              {moves.map((m, i) => {
                const d = m.movedAt instanceof Date ? m.movedAt : new Date(m.movedAt);
                const herd = HERDS.find((h) => h.id === m.herdId);
                const isLast = i === moves.length - 1;

                return (
                  <div key={m.id} className={`relative flex gap-4 ${isLast ? '' : 'pb-4'}`}>
                    {/* Dot */}
                    <div
                      className="absolute -left-[13px] top-3 w-3 h-3 rounded-full border-2 shrink-0"
                      style={{ borderColor: '#DEFF9A', backgroundColor: '#0A0A0B' }}
                    />

                    <div
                      className="flex-1 rounded-2xl border border-surface2 px-5 py-4"
                      style={{ backgroundColor: '#111112' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-sm">{m.herdName}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm flex-wrap">
                            <span className="text-muted text-xs">
                              {m.fromPastureName ?? 'Entrada externa'}
                            </span>
                            <span className="text-lime text-xs">→</span>
                            <span className="text-white text-xs font-medium">{m.toPastureName}</span>
                          </div>
                          {m.notes && (
                            <p className="text-muted text-xs italic mt-1">{m.notes}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-muted text-xs">
                            {d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                          </p>
                          {m.movedBy && (
                            <p className="text-muted/60 text-[10px] mt-0.5">{m.movedBy}</p>
                          )}
                        </div>
                      </div>

                      {/* Herd quick stats */}
                      {herd && (
                        <div className="mt-2 pt-2 border-t border-surface2 flex items-center gap-4">
                          <span className="text-muted text-xs">
                            🐄 {herd.cattleCount} cab · {herd.breed || herd.species}
                          </span>
                          {farmSlug && herd.pastureId && (
                            <Link
                              href={`/${farmSlug}/${herd.pastureId}`}
                              className="text-lime/60 text-xs hover:text-lime transition-colors ml-auto"
                            >
                              Ver potrero actual →
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
