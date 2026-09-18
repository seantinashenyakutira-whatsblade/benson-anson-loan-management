'use client';

import { useAuth } from '@/components/auth-provider';
import { can, canAny, type Role } from '@/lib/permissions';

/**
 * usePermissions — client hook backed by the existing AuthProvider
 * (no duplicate session provider; profile.role is the source of truth).
 */
export function usePermissions() {
  const { profile } = useAuth();
  const role = (profile?.role || null) as Role | null;
  return {
    role,
    can: (permission: string) => can(role, permission),
    canAny: (permissions: string[]) => canAny(role, permissions),
  };
}
