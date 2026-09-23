/**
 * permissions.ts — Role-based UI permission layer (Phase 10.1).
 * Code constants are the DEFAULTS. Phase 10.3 adds a DB override layer
 * (loadRoleOverrides) that replaces these per-role when present.
 * RLS remains the real enforcement; this only hides affordances.
 */

export type Role = 'owner' | 'branch_manager' | 'loan_officer' | 'cashier';

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  owner: ['*'],
  branch_manager: [
    'customers.*',
    'collateral.*',
    'loans.*',
    'applications.*',
    'payments.*',
    'penalties.view',
    'penalties.waive',
    'collections.*',
    'accounting.*',
    'reports.view',
    'reports.export',
    'settings.view',
    'invitations.create',
    'invitations.approve',
    'staff.view',
    'leads.*',
    'audit.view',
    'chat.*',
    'profile.self',
  ],
  loan_officer: [
    'customers.create',
    'customers.view',
    'customers.edit_own',
    'collateral.create',
    'collateral.view',
    'applications.create',
    'applications.view_own',
    'loans.view_own',
    'collections.*',
    'notes.create',
    'notes.view_own',
    'invitations.create',
    'invitations.view_own',
    'leads.view_own',
    'chat.*',
    'profile.self',
  ],
  cashier: [
    'customers.view',
    'loans.view',
    'payments.create',
    'payments.view',
    'payments.reverse',
    'receipts.print',
    'expenses.create',
    'expenses.view',
    'accounting.view',
    'chat.*',
    'profile.self',
  ],
};

export function can(role: Role | string | null | undefined, permission: string, overrides?: Record<Role, string[]>): boolean {
  if (!role) return false;
  if (role === 'owner') return true;
  const perms = overrides?.[role as Role] ?? ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  return perms.some(
    (p) => p === permission || (p.endsWith('.*') && permission.startsWith(p.slice(0, -2) + '.')),
  );
}

export function canAny(role: Role | string | null | undefined, permissions: string[], overrides?: Record<Role, string[]>): boolean {
  return permissions.some((p) => can(role, p, overrides));
}

/** Route access matrix for the server layout guard. Returns false = denied. */
export function canAccessRoute(role: Role | string | null | undefined, pathname: string): boolean {
  if (!role) return false;
  if (role === 'owner') return true;
  if (pathname.startsWith('/users')) return false;
  if (pathname.startsWith('/audit')) return role === 'branch_manager';
  if (pathname.startsWith('/settings')) return role === 'branch_manager';
  if (pathname.startsWith('/accounting')) return role === 'branch_manager' || role === 'cashier';
  if (pathname.startsWith('/reports')) return role === 'branch_manager';
  if (pathname.startsWith('/applications')) return role !== 'cashier'; // officers create/view own; RLS scopes rows
  if (pathname.startsWith('/leads')) return role !== 'cashier';
  if (pathname.startsWith('/invitations')) return role === 'branch_manager' || role === 'loan_officer';
  return true;
}

/** Sidebar visibility per role. */
export function visibleNav(role: Role | string | null | undefined): string[] {
  if (role === 'owner') return ['all'];
  switch (role) {
    case 'branch_manager':
      return ['dashboard', 'customers', 'collateral', 'loans', 'applications', 'leads', 'invitations', 'payments', 'collections', 'penalties', 'accounting', 'reports', 'settings', 'audit'];
    case 'loan_officer':
      return ['dashboard', 'customers', 'collateral', 'loans', 'applications', 'leads', 'invitations', 'collections'];
    case 'cashier':
      return ['dashboard', 'customers', 'loans', 'payments', 'accounting'];
    default:
      return [];
  }
}

/* ── DB override layer (Phase 10.3) ─────────────────────────
 * Overrides are loaded once per session from role_permissions via
 * rpc_get_role_permissions. When a role has rows, they replace the
 * constants; an empty/absent set falls back to ROLE_PERMISSIONS.
 * RLS stays authoritative — this only drives UI affordances. */

import type { SupabaseClient } from '@supabase/supabase-js';

let overrideCache: Record<Role, string[]> | null = null;
let overridePromise: Promise<Record<Role, string[]> | null> | null = null;

export function getCachedOverrides(): Record<Role, string[]> | null {
  return overrideCache;
}

async function fetchOverrides(sb: SupabaseClient): Promise<Record<Role, string[]> | null> {
  try {
    const roles: Role[] = ['branch_manager', 'loan_officer', 'cashier'];
    const out = {} as Record<Role, string[]>;
    for (const r of roles) {
      const { data, error } = await sb.rpc('rpc_get_role_permissions', { p_role: r });
      if (error) return null;
      out[r] = (data as string[]) || [];
    }
    return out;
  } catch {
    return null;
  }
}

/** Load once and cache; concurrent callers share the promise. */
export function loadRoleOverrides(sb: SupabaseClient): Promise<Record<Role, string[]> | null> {
  if (overrideCache) return Promise.resolve(overrideCache);
  if (!overridePromise) {
    overridePromise = fetchOverrides(sb).then((o) => {
      if (o) overrideCache = o;
      overridePromise = null;
      return o;
    });
  }
  return overridePromise;
}

/** Drop the cache (call after the matrix page saves). */
export function clearOverrideCache(): void {
  overrideCache = null;
}
