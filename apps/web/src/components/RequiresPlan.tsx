'use client';

/**
 * RequiresPlan — gates UI behind a plan tier.
 *
 * Usage:
 *   <RequiresPlan feature="canUseERP">
 *     <ERPPanel />
 *   </RequiresPlan>
 *
 *   <RequiresPlan minPlan="pro" fallback={<UpgradeBanner feature="ERP" />}>
 *     <FinancialChart />
 *   </RequiresPlan>
 */

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePlan, type PlanTier } from '@/lib/usePlan';

type PlanFeature = 'canUseERP' | 'canInviteUsers' | 'canMultiFarm' | 'canUseMachinery' | 'canExport';

const PLAN_ORDER: PlanTier[] = ['basico', 'pro', 'estancia'];

const PLAN_NAMES: Record<PlanTier, string> = {
  basico:   'Básico',
  pro:      'Pro',
  estancia: 'Estancia',
};

interface RequiresPlanProps {
  /** Gate by a specific feature flag */
  feature?: PlanFeature;
  /** Gate by minimum plan tier */
  minPlan?: PlanTier;
  /** Custom fallback; defaults to <UpgradeBanner> */
  fallback?: ReactNode;
  children: ReactNode;
}

export default function RequiresPlan({ feature, minPlan, fallback, children }: RequiresPlanProps) {
  const planState = usePlan();

  // Determine access
  let allowed = true;
  if (feature) {
    allowed = planState[feature];
  }
  if (minPlan) {
    allowed = PLAN_ORDER.indexOf(planState.plan) >= PLAN_ORDER.indexOf(minPlan);
  }

  if (!allowed) {
    return (
      <>
        {fallback ?? (
          <DefaultUpgradeBanner
            requiredPlan={minPlan ?? (feature ? featurePlan(feature) : 'pro')}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}

/** Minimum plan that unlocks a given feature */
function featurePlan(f: PlanFeature): PlanTier {
  const map: Record<PlanFeature, PlanTier> = {
    canUseERP:      'pro',
    canInviteUsers: 'pro',
    canMultiFarm:   'estancia',
    canUseMachinery: 'pro',
    canExport:      'pro',
  };
  return map[f];
}

function DefaultUpgradeBanner({ requiredPlan }: { requiredPlan: PlanTier }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-6 py-10 text-center"
    >
      <div className="text-3xl">🔒</div>
      <div>
        <p className="text-white font-semibold text-sm mb-1">
          Función disponible en el plan {PLAN_NAMES[requiredPlan]}
        </p>
        <p className="text-muted text-xs max-w-xs mx-auto">
          Actualizá tu plan para acceder a esta funcionalidad.
        </p>
      </div>
      <Link
        href="/billing"
        className="rounded-xl px-5 py-2 text-sm font-bold text-charcoal transition-all hover:brightness-110"
        style={{ backgroundColor: '#DEFF9A' }}
      >
        Ver planes
      </Link>
    </div>
  );
}
