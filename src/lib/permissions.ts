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
  if (pathname.startsWith('/users') || pathname.startsWith('/audit')) return false;
  if (pathname.startsWith('/settings')) return role === 'branch_manager';
  if (pathname.startsWith('/accounting')) return role === 'branch_manager' || role === 'cashier';
  if (pathname.startsWith('/reports')) return role === 'branch_manager';
  if (pathname.startsWith('/applications')) return role !== 'cashier'; // officers create/view own; RLS scopes rows
  return true;
}

/** Sidebar visibility per role. */
export function visibleNav(role: Role | string | null | undefined): string[] {
  if (role === 'owner') return ['all'];
  switch (role) {
    case 'branch_manager':
      return ['dashboard', 'customers', 'collateral', 'loans', 'applications', 'payments', 'collections', 'penalties', 'accounting', 'reports', 'settings'];
    case 'loan_officer':
      return ['dashboard', 'customers', 'collateral', 'loans', 'applications', 'collections'];
    case 'cashier':
      return ['dashboard', 'customers', 'loans', 'payments', 'accounting'];
    default:
      return [];
  }
}
