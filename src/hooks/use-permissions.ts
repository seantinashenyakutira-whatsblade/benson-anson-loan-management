'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { can, canAny, loadRoleOverrides, getCachedOverrides, type Role } from '@/lib/permissions';

/**
 * usePermissions — client hook backed by the existing AuthProvider
 * (no duplicate session provider; profile.role is the source of truth).
 * DB overrides from role_permissions replace the code defaults once loaded.
 */
export function usePermissions() {
  const { profile } = useAuth();
  const role = (profile?.role || null) as Role | null;
  const [overrides, setOverrides] = useState<Record<Role, string[]> | null>(() => getCachedOverrides());
  const supabase = createClient();

  useEffect(() => {
    if (!getCachedOverrides()) {
      loadRoleOverrides(supabase).then((o) => {
        if (o) setOverrides(o);
      });
    }
  }, [supabase]);

  return {
    role,
    can: (permission: string) => can(role, permission, overrides || undefined),
    canAny: (permissions: string[]) => canAny(role, permissions, overrides || undefined),
  };
}
