'use client';

/**
 * RoleGate — conditionally renders children based on the user's farm role.
 *
 * Usage:
 *   <RoleGate allow={['owner', 'capataz']}>
 *     <button>Editar</button>
 *   </RoleGate>
 *
 *   <RoleGate allow="owner" fallback={<p>Solo dueños</p>}>
 *     <AdminPanel />
 *   </RoleGate>
 */

import type { ReactNode } from 'react';
import { useFarmData } from '@/lib/FarmDataContext';
import type { FarmRole } from '@/lib/useRole';

interface RoleGateProps {
  /** Roles that are allowed to see children. Pass a single role or an array. */
  allow: FarmRole | FarmRole[];
  /** Rendered when the user's role is NOT in allow list. Defaults to null. */
  fallback?: ReactNode;
  children: ReactNode;
}

export default function RoleGate({ allow, fallback = null, children }: RoleGateProps) {
  const { userRole } = useFarmData();

  const allowed = Array.isArray(allow) ? allow : [allow];
  if (!allowed.includes(userRole)) return <>{fallback}</>;
  return <>{children}</>;
}

/**
 * useCanDo — imperative hook version for conditional logic outside JSX.
 *
 * const { canEditHerds, isOwner } = useCanDo();
 */
export function useCanDo() {
  const { userRole } = useFarmData();

  const is = (role: FarmRole) => userRole === role;
  const any = (...roles: FarmRole[]) => roles.includes(userRole);

  return {
    role:             userRole,
    isOwner:          is('owner'),
    isCapataz:        any('owner', 'capataz', 'manager'),
    isEmpleado:       !any('owner', 'capataz', 'manager') && userRole !== null,
    canEditHerds:     any('owner', 'capataz', 'manager'),
    canEditPastures:  any('owner', 'capataz', 'manager'),
    canViewFinancials: any('owner', 'capataz', 'manager'),
    canManageTeam:    is('owner'),
    canAddRecords:    userRole !== null,
  };
}
