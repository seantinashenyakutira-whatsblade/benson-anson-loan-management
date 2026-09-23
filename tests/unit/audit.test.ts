import { describe, it, expect } from 'vitest';
import { canAccessRoute } from '@/lib/permissions';

describe('audit route access', () => {
  it('allows owner and branch_manager, denies others', () => {
    expect(canAccessRoute('owner', '/audit')).toBe(true);
    expect(canAccessRoute('branch_manager', '/audit')).toBe(true);
    expect(canAccessRoute('loan_officer', '/audit')).toBe(false);
    expect(canAccessRoute('cashier', '/audit')).toBe(false);
    expect(canAccessRoute(null, '/audit')).toBe(false);
  });

  it('audit is visible in nav for owner and BM only', async () => {
    const { visibleNav } = await import('@/lib/permissions');
    expect(visibleNav('owner')).toContain('all');
    expect(visibleNav('branch_manager')).toContain('audit');
    expect(visibleNav('loan_officer')).not.toContain('audit');
    expect(visibleNav('cashier')).not.toContain('audit');
  });
});
