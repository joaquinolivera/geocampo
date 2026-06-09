'use client';

/**
 * usePlan — returns the current farm's subscription plan and gate helpers.
 *
 * Plan tiers (ascending):
 *   basico ($29) → pro ($79) → estancia ($179)
 *
 * Maps legacy 'starter' → 'basico', 'enterprise' → 'estancia'.
 *
 * Usage:
 *   const { plan, isPro, canUseERP, canInviteUsers } = usePlan();
 */

import { useEffect, useState, useCallback } from 'react';
import { getBrowserClient, IS_DEMO_MODE } from '@/lib/supabase';
import { useFarmData } from '@/lib/FarmDataContext';

export type PlanTier = 'basico' | 'pro' | 'estancia';
export type SubStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';

export interface PlanState {
  plan: PlanTier;
  status: SubStatus;
  isLoading: boolean;
  /** Trial or active */
  isActive: boolean;
  /** Pro or Estancia */
  isPro: boolean;
  /** Estancia only */
  isEstancia: boolean;
  // Feature gates
  /** Max pastures allowed (999 = unlimited) */
  maxPastures: number;
  /** Max team members (includes owner) */
  maxMembers: number;
  /** ERP, lotes comerciales, P&L access */
  canUseERP: boolean;
  /** Invite team members */
  canInviteUsers: boolean;
  /** Multi-farm support */
  canMultiFarm: boolean;
  /** Full machinery module */
  canUseMachinery: boolean;
  /** Export PDF/CSV */
  canExport: boolean;
}

const PLAN_CAPS: Record<PlanTier, Omit<PlanState, 'plan' | 'status' | 'isLoading' | 'isActive' | 'isPro' | 'isEstancia'>> = {
  basico: {
    maxPastures:    3,
    maxMembers:     1,
    canUseERP:      false,
    canInviteUsers: false,
    canMultiFarm:   false,
    canUseMachinery: false,
    canExport:      false,
  },
  pro: {
    maxPastures:    999,
    maxMembers:     5,
    canUseERP:      true,
    canInviteUsers: true,
    canMultiFarm:   false,
    canUseMachinery: true,
    canExport:      true,
  },
  estancia: {
    maxPastures:    999,
    maxMembers:     999,
    canUseERP:      true,
    canInviteUsers: true,
    canMultiFarm:   true,
    canUseMachinery: true,
    canExport:      true,
  },
};

function normalizePlan(raw: string | null | undefined): PlanTier {
  if (raw === 'starter' || raw === 'basico') return 'basico';
  if (raw === 'pro')                          return 'pro';
  if (raw === 'enterprise' || raw === 'estancia') return 'estancia';
  return 'basico';
}

function buildState(plan: PlanTier, status: SubStatus, isLoading: boolean): PlanState {
  const caps = PLAN_CAPS[plan];
  const isActive = status === 'trialing' || status === 'active';
  return {
    plan,
    status,
    isLoading,
    isActive,
    isPro: plan === 'pro' || plan === 'estancia',
    isEstancia: plan === 'estancia',
    ...caps,
  };
}

export function usePlan(): PlanState {
  const { farmId } = useFarmData();
  const [plan, setPlan]       = useState<PlanTier>('basico');
  const [status, setStatus]   = useState<SubStatus>('trialing');
  const [isLoading, setLoading] = useState(true);

  // Demo / offline mode — grant all Estancia features so devs can use every page
  if (IS_DEMO_MODE) {
    return buildState('estancia', 'active', false);
  }

  const fetchPlan = useCallback(async () => {
    if (!farmId) {
      setLoading(false);
      return;
    }

    const client = getBrowserClient();
    if (!client) {
      setLoading(false);
      return;
    }

    const { data } = await client
      .from('farms')
      .select('subscription_plan, subscription_status')
      .eq('id', farmId)
      .maybeSingle();

    if (data) {
      setPlan(normalizePlan(data.subscription_plan));
      setStatus((data.subscription_status as SubStatus) ?? 'trialing');
    }
    setLoading(false);
  }, [farmId]);

  useEffect(() => {
    setLoading(true);
    void fetchPlan();
  }, [fetchPlan]);

  return buildState(plan, status, isLoading);
}
