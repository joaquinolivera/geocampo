'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getBrowserClient } from '@/lib/supabase';
import { usePlan, type PlanTier } from '@/lib/usePlan';
import { useFarmData } from '@/lib/FarmDataContext';

const PLANS: {
  id: 'basico' | 'pro' | 'estancia';
  name: string;
  price: string;
  features: string[];
  highlighted?: boolean;
}[] = [
  {
    id:    'basico',
    name:  'Básico',
    price: 'USD 29/mes',
    features: [
      'Hasta 3 potreros',
      'Hasta 500 cabezas',
      '1 usuario (solo dueño)',
      'Registros de pesos y sanidad',
      'Mapa satelital',
    ],
  },
  {
    id:    'pro',
    name:  'Pro',
    price: 'USD 79/mes',
    features: [
      'Potreros ilimitados',
      'ERP completo (gastos, maquinaria)',
      'Lotes comerciales + P&L',
      'Equipo hasta 5 usuarios',
      'Exportar PDF / CSV',
    ],
    highlighted: true,
  },
  {
    id:    'estancia',
    name:  'Estancia',
    price: 'USD 179/mes',
    features: [
      'Todo lo del plan Pro',
      'Multi-campo ilimitado',
      'Usuarios ilimitados',
      'Soporte prioritario',
      'Proyección de flujo de caja',
    ],
  },
];

const STATUS_LABELS: Record<string, string> = {
  trialing:   'En prueba',
  active:     'Activo',
  past_due:   'Pago pendiente',
  canceled:   'Cancelado',
  incomplete: 'Incompleto',
};

const STATUS_COLOR: Record<string, string> = {
  trialing:   'text-amber-400',
  active:     'text-lime',
  past_due:   'text-red-400',
  canceled:   'text-muted',
  incomplete: 'text-red-400',
};

export default function BillingPage() {
  const { plan: currentPlan, status, isLoading: planLoading } = usePlan();
  const { farmId } = useFarmData();

  const [loading, setLoading] = useState<string | null>(null);
  const [error,   setError]   = useState<string | null>(null);
  const [trialEnd, setTrialEnd] = useState<string | null>(null);

  useEffect(() => {
    if (!farmId) return;
    const client = getBrowserClient();
    if (!client) return;

    void (async () => {
      const { data } = await client
        .from('farms')
        .select('trial_ends_at')
        .eq('id', farmId)
        .maybeSingle();
      if (data?.trial_ends_at) {
        const d = new Date(data.trial_ends_at as string);
        setTrialEnd(d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }));
      }
    })();
  }, [farmId]);

  async function handleSubscribe(planId: string) {
    setLoading(planId);
    setError(null);
    try {
      const client = getBrowserClient();
      const session = client ? (await client.auth.getSession()).data.session : null;

      const res = await fetch('/api/checkout', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          ...(session ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await res.json() as { url?: string; error?: string };

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Error creando sesión de pago');
      }

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      setLoading(null);
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center px-4 py-12"
      style={{ backgroundColor: '#0A0A0B', color: '#fff' }}
    >
      {/* Header */}
      <div className="text-center mb-10">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5"
          style={{ backgroundColor: 'rgba(222,255,154,0.1)', border: '1px solid rgba(222,255,154,0.2)' }}
        >
          🌿
        </div>
        <h1 className="text-2xl font-black mb-2">Planes de GeoCampo</h1>
        <p className="text-white/50 text-sm max-w-md mx-auto leading-relaxed">
          Elegí el plan que mejor se adapta a tu campo. Sin compromisos, cancelá cuando quieras.
        </p>

        {/* Current plan status */}
        {!planLoading && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-surface2 px-4 py-1.5 text-sm">
            <span className="text-muted">Plan actual:</span>
            <span className="text-white font-semibold capitalize">{currentPlan}</span>
            <span className="mx-1 text-surface2">·</span>
            <span className={STATUS_COLOR[status] ?? 'text-muted'}>
              {STATUS_LABELS[status] ?? status}
            </span>
            {status === 'trialing' && trialEnd && (
              <span className="text-white/40 text-xs">hasta {trialEnd}</span>
            )}
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-3xl mb-8">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id && (status === 'active' || status === 'trialing');
          return (
            <div
              key={plan.id}
              className="flex-1 rounded-2xl border p-6 flex flex-col relative"
              style={{
                borderColor:     plan.highlighted ? 'rgba(222,255,154,0.4)' : 'rgba(255,255,255,0.1)',
                backgroundColor: plan.highlighted ? '#1A1F0A' : '#111112',
              }}
            >
              {plan.highlighted && (
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(222,255,154,0.8)' }}>
                  ⭐ Recomendado
                </p>
              )}
              {isCurrent && (
                <span className="absolute top-4 right-4 text-[10px] font-bold uppercase tracking-wider text-lime bg-lime/10 border border-lime/20 rounded-full px-2 py-0.5">
                  Tu plan
                </span>
              )}
              <h2 className="text-white font-bold text-lg mb-0.5">{plan.name}</h2>
              <p className="text-sm mb-4" style={{ color: plan.highlighted ? '#DEFF9A' : '#fff' }}>
                {plan.price}
              </p>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                    <span style={{ color: '#DEFF9A' }} className="mt-px shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null || isCurrent}
                className="w-full rounded-xl py-2.5 text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={
                  plan.highlighted
                    ? { backgroundColor: '#DEFF9A', color: '#0A0A0B' }
                    : { border: '1px solid rgba(255,255,255,0.2)', color: '#fff' }
                }
              >
                {loading === plan.id
                  ? 'Redirigiendo…'
                  : isCurrent
                  ? 'Plan activo'
                  : `Activar ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

      <p className="text-white/30 text-xs text-center max-w-sm mb-6">
        Los precios son en dólares estadounidenses y se facturan mensualmente.{' '}
        <a href="mailto:hola@geocampo.app" className="underline hover:text-white/60 transition-colors">
          ¿Tenés preguntas?
        </a>
      </p>

      <Link
        href="/"
        className="text-white/20 text-xs hover:text-white/50 transition-colors"
      >
        ← Volver al campo
      </Link>
    </main>
  );
}
