import { createClient } from '@/lib/supabase/server';

export type AppRole = 'owner' | 'branch_manager' | 'loan_officer' | 'cashier';

const ROLE_HIERARCHY: Record<AppRole, number> = {
  owner: 4,
  branch_manager: 3,
  loan_officer: 2,
  cashier: 1,
};

export function hasMinimumRole(userRole: AppRole, requiredRole: AppRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[requiredRole] ?? 0);
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}

export async function getUserRole(): Promise<AppRole | null> {
  const profile = await getCurrentUser();
  return (profile?.role as AppRole) ?? null;
}

export async function hasPermission(permissionCode: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile) return false;
  if (profile.role === 'owner') return true;

  const { data } = await supabase
    .from('role_permissions')
    .select('id')
    .eq('role', profile.role)
    .eq('permission_id', (
      await supabase
        .from('permissions')
        .select('id')
        .eq('code', permissionCode)
        .single()
    )?.data?.id ?? '')
    .single();

  return !!data;
}

export function canApproveLoans(role: AppRole): boolean {
  return role === 'owner' || role === 'branch_manager';
}

export function canDisburseLoans(role: AppRole): boolean {
  return role === 'owner' || role === 'branch_manager';
}

export function canRecordPayments(role: AppRole): boolean {
  return role === 'owner' || role === 'cashier';
}

export function canManageUsers(role: AppRole): boolean {
  return role === 'owner';
}

export function canManageSettings(role: AppRole): boolean {
  return role === 'owner';
}

export function canViewAccounting(role: AppRole): boolean {
  return role === 'owner' || role === 'branch_manager';
}

export function canAssessPenalties(role: AppRole): boolean {
  return role === 'owner' || role === 'branch_manager';
}

export function canWaivePenalties(role: AppRole): boolean {
  return role === 'owner' || role === 'branch_manager';
}

export function canExportReports(role: AppRole): boolean {
  return role === 'owner' || role === 'branch_manager';
}
