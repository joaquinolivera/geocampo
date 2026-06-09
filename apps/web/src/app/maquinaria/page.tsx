'use client';

/**
 * /maquinaria — Fleet / Machinery list
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';
import { useCanDo } from '@/components/RoleGate';
import RequiresPlan from '@/components/RequiresPlan';

interface Machine {
  id: string;
  name: string;
  type: string | null;
  brand: string | null;
  model: string | null;
  year: number | null;
  status: 'active' | 'maintenance' | 'retired';
  horometro_actual: number | null;
  purchase_price: number | null;
}

const TIPO_ICON: Record<string, string> = {
  tractor:       '🚜',
  cosechadora:   '🌾',
  sembradora:    '🌱',
  pulverizadora: '💧',
  camion:        '🚛',
  camioneta:     '🚗',
  acoplado:      '📦',
  implemento:    '🔧',
};

const ESTADO_BADGE: Record<string, string> = {
  active:      'bg-lime/20 text-lime',
  maintenance: 'bg-amber-500/20 text-amber-400',
  retired:     'bg-surface2 text-muted',
};

const ESTADO_LABEL: Record<string, string> = {
  active:      'Activo',
  maintenance: 'Mantenimiento',
  retired:     'Dado de baja',
};

export default function MaquinariaPage() {
  const { farmId } = useFarmData();
  const { canEditHerds } = useCanDo();
  const router = useRouter();

  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!farmId) return;
    const client = getBrowserClient();
    if (!client) { setLoading(false); return; }

    void (async () => {
      const { data } = await client
        .from('machinery')
        .select('id, name, type, brand, model, year, status, horometro_actual, purchase_price')
        .eq('farm_id', farmId)
        .neq('status', 'retired')
        .order('name');
      setMachines((data ?? []) as Machine[]);
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
    <RequiresPlan feature="canUseMachinery">
      <div className="min-h-screen bg-charcoal text-white">
        <div className="border-b border-surface2 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-muted hover:text-white transition-colors text-sm">← Volver</Link>
            <h1 className="text-lg font-bold">Maquinaria</h1>
          </div>
          {canEditHerds && (
            <Link
              href="/maquinaria/nueva"
              className="rounded-xl px-4 py-2 text-sm font-bold text-charcoal hover:brightness-110 transition-all"
              style={{ backgroundColor: '#DEFF9A' }}
            >
              + Nueva máquina
            </Link>
          )}
        </div>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {machines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="text-5xl">🚜</div>
              <h2 className="text-white font-semibold text-lg">Sin maquinaria registrada</h2>
              <p className="text-muted text-sm max-w-xs">
                Registrá tractores, cosechadoras y equipos para llevar el control de combustible, mantenimiento y depreciación.
              </p>
              {canEditHerds && (
                <Link
                  href="/maquinaria/nueva"
                  className="mt-2 rounded-xl px-6 py-3 text-sm font-bold text-charcoal hover:brightness-110 transition-all"
                  style={{ backgroundColor: '#DEFF9A' }}
                >
                  Agregar primer equipo
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {machines.map((m) => (
                <button
                  key={m.id}
                  onClick={() => router.push(`/maquinaria/${m.id}`)}
                  className="text-left rounded-2xl border border-surface2 px-5 py-4 hover:border-lime/30 transition-colors"
                  style={{ backgroundColor: '#111112' }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{TIPO_ICON[m.type ?? ''] ?? '⚙️'}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold truncate">{m.name}</span>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${ESTADO_BADGE[m.status] ?? ''}`}>
                          {ESTADO_LABEL[m.status]}
                        </span>
                      </div>
                      <p className="text-muted text-xs mt-0.5">
                        {[m.brand, m.model, m.year].filter(Boolean).join(' · ')}
                      </p>
                      {m.horometro_actual != null && (
                        <p className="text-muted text-xs mt-0.5">
                          {m.horometro_actual.toLocaleString('es-AR')} hs
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </RequiresPlan>
  );
}
