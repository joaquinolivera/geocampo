'use client';

/**
 * useRole — returns the current user's role on the active farm.
 *
 * Role hierarchy (most → least privileged):
 *   owner > capataz > empleado
 *
 * Usage:
 *   const { role, isOwner, isCapataz, canEditHerds } = useRole(farmId);
 */

import { useEffect, useState, useCallback } from 'react';
import { getBrowserClient } from '@/lib/supabase';

export type FarmRole = 'owner' | 'capataz' | 'manager' | 'empleado' | 'employee' | 'vet' | 'viewer' | null;

export interface RoleState {
  role: FarmRole;
  isLoading: boolean;
  /** Owner — full control of farm settings, members, billing */
  isOwner: boolean;
  /** Capataz / Manager — operational control, no billing/settings */
  isCapataz: boolean;
  /** Empleado — read-only + record entry */
  isEmpleado: boolean;
  /** Can add/edit pastures and herds */
  canEditHerds: boolean;
  /** Can see financial data (ERP, lotes, costs) */
  canViewFinancials: boolean;
  /** Can invite or remove team members */
  canManageTeam: boolean;
}

const OWNER_ROLES: FarmRole[]     = ['owner'];
const CAPATAZ_ROLES: FarmRole[]   = ['owner', 'capataz', 'manager'];
const EDIT_ROLES: FarmRole[]      = ['owner', 'capataz', 'manager'];
const FINANCE_ROLES: FarmRole[]   = ['owner', 'capataz', 'manager'];

function deriveState(role: FarmRole, isLoading: boolean): RoleState {
  return {
    role,
    isLoading,
    isOwner:          OWNER_ROLES.includes(role),
    isCapataz:        CAPATAZ_ROLES.includes(role),
    isEmpleado:       role !== null && !CAPATAZ_ROLES.includes(role),
    canEditHerds:     EDIT_ROLES.includes(role),
    canViewFinancials: FINANCE_ROLES.includes(role),
    canManageTeam:    OWNER_ROLES.includes(role),
  };
}

export function useRole(farmId: string | null | undefined): RoleState {
  const [role, setRole]       = useState<FarmRole>(null);
  const [isLoading, setLoading] = useState(true);

  const fetchRole = useCallback(async () => {
    if (!farmId) {
      setRole(null);
      setLoading(false);
      return;
    }

    const client = getBrowserClient();
    if (!client) {
      setRole(null);
      setLoading(false);
      return;
    }

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const { data, error } = await client
      .from('farm_members')
      .select('role')
      .eq('farm_id', farmId)
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null)
      .maybeSingle();

    if (error || !data) {
      setRole(null);
    } else {
      setRole(data.role as FarmRole);
    }
    setLoading(false);
  }, [farmId]);

  useEffect(() => {
    setLoading(true);
    void fetchRole();
  }, [fetchRole]);

  return deriveState(role, isLoading);
}
