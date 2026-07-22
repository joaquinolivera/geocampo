'use client';

/**
 * /lotes — Lotes Comerciales list
 *
 * Shows all batches for the current farm, open and closed.
 * Owners/capataz can open new batches.
 */

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';
import { useCanDo } from '@/components/RoleGate';
import RequiresPlan from '@/components/RequiresPlan';

interface LotePnl {
  id: string;
  nombre: string;
  estado: 'abierto' | 'cerrado' | 'cancelado';
  fecha_entrada: string;
  fecha_salida: string | null;
  cabezas_entrada: number;
  cabezas_salida: number | null;
  dias_engorde: number | null;
  costo_total: number;
  resultado_neto: number | null;
  roi_pct: number | null;
  adg_kg_dia: number | null;
  moneda: string;
}

const ESTADO_BADGE: Record<string, string> = {
  abierto:   'bg-lime/20 text-lime',
  cerrado:   'bg-blue-500/20 text-blue-300',
  cancelado: 'bg-surface2 text-muted',
};

function fmtCurrency(n: number, moneda: string) {
  return `${moneda} ${n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function LotesPage() {
  const { farmId } = useFarmData();
  const { canViewFinancials, canEditHerds } = useCanDo();
  const router = useRouter();

  const [lotes, setLotes]   = useState<LotePnl[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!farmId) return;
    const client = getBrowserClient();
    if (!client) { setLoading(false); return; }

    void (async () => {
      const { data } = await client
        .from('lote_pnl')
        .select('*')
        .eq('farm_id', farmId)
        .order('fecha_entrada', { ascending: false });
      setLotes((data ?? []) as LotePnl[]);
      setLoading(false);
    })();
  }, [farmId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-charcoal text-white">
        {/* Header */}
        <div className="border-b border-surface2 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted hover:text-white transition-colors text-sm">← Volver</Link>
            <h1 className="text-lg font-bold">Lotes Comerciales</h1>
          </div>
          {canEditHerds && (
            <Link
              href="/lotes/nuevo"
              className="rounded-xl px-4 py-2 text-sm font-bold text-charcoal transition-all hover:brightness-110"
              style={{ backgroundColor: '#DEFF9A' }}
            >
              + Nuevo lote
            </Link>
          )}
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {lotes.length === 0 ? (
            <EmptyState canCreate={canEditHerds} />
          ) : (
            <div className="space-y-3">
              {lotes.map((l) => (
                <button
                  key={l.id}
                  onClick={() => router.push(`/lotes/${l.id}`)}
                  className="w-full text-left rounded-2xl border border-surface2 px-5 py-4 hover:border-lime/30 transition-colors"
                  style={{ backgroundColor: '#111112' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white font-semibold truncate">{l.nombre}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${ESTADO_BADGE[l.estado] ?? ''}`}>
                          {l.estado}
                        </span>
                      </div>
                      <p className="text-muted text-xs">
                        {l.cabezas_entrada} cabezas · Entrada {new Date(l.fecha_entrada).toLocaleDateString('es-AR')}
                        {l.fecha_salida ? ` · Salida ${new Date(l.fecha_salida).toLocaleDateString('es-AR')}` : ''}
                        {l.dias_engorde ? ` · ${l.dias_engorde} días` : ''}
                      </p>
                    </div>

                    {canViewFinancials && (
                      <div className="text-right shrink-0">
                        <p className="text-white text-sm font-bold">
                          {fmtCurrency(l.costo_total, l.moneda)}
                        </p>
                        {l.resultado_neto !== null && (
                          <p className={`text-xs font-semibold ${l.resultado_neto >= 0 ? 'text-lime' : 'text-red-400'}`}>
                            {l.resultado_neto >= 0 ? '+' : ''}{fmtCurrency(l.resultado_neto, l.moneda)}
                            {l.roi_pct !== null ? ` (${l.roi_pct}% ROI)` : ''}
                          </p>
                        )}
                        {l.adg_kg_dia !== null && (
                          <p className="text-muted text-[10px]">ADG {l.adg_kg_dia.toFixed(2)} kg/día</p>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}

function EmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="text-5xl">🐄</div>
      <h2 className="text-white font-semibold text-lg">Sin lotes comerciales aún</h2>
      <p className="text-muted text-sm max-w-xs">
        Los lotes te permiten hacer seguimiento de un grupo de animales desde la compra hasta la venta, con P&L detallado.
      </p>
      {canCreate && (
        <Link
          href="/lotes/nuevo"
          className="mt-2 rounded-xl px-6 py-3 text-sm font-bold text-charcoal transition-all hover:brightness-110"
          style={{ backgroundColor: '#DEFF9A' }}
        >
          Abrir primer lote
        </Link>
      )}
    </div>
  );
}
