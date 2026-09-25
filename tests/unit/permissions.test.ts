import { describe, it, expect } from 'vitest';
import { can, canAny, canAccessRoute, visibleNav } from '@/lib/permissions';

describe('can', () => {
  it('denies cashier applications.approve', () => {
    expect(can('cashier', 'applications.approve')).toBe(false);
  });
  it('allows branch_manager payments.view', () => {
    expect(can('branch_manager', 'payments.view')).toBe(true);
  });
  it('grants owners everything via wildcard', () => {
    expect(can('owner', 'anything.at.all')).toBe(true);
  });
  it('denies unknown roles and missing roles', () => {
    expect(can('hacker', 'loans.view')).toBe(false);
    expect(can(null, 'loans.view')).toBe(false);
    expect(can(undefined, 'loans.view')).toBe(false);
  });
  it('matches module wildcards with dot boundary', () => {
    expect(can('branch_manager', 'loans.disburse')).toBe(true);
    expect(can('loan_officer', 'loans.view_own')).toBe(true);
    expect(can('loan_officer', 'loans.disburse')).toBe(false);
    // 'loans.view' must not match 'loans.view_own'-style prefix leaks in reverse:
    // 'customers.create' should not grant 'customers.createX'
    expect(can('cashier', 'customers.viewX')).toBe(false);
  });
});

describe('canAny', () => {
  it('returns true when any permission matches', () => {
    expect(canAny('loan_officer', ['loans.delete', 'loans.create'])).toBe(false);
    expect(canAny('loan_officer', ['loans.delete', 'customers.create'])).toBe(true);
    expect(canAny('cashier', ['payments.create', 'payments.reverse'])).toBe(true);
  });
});

describe('canAccessRoute', () => {
  it('lets owners everywhere', () => {
    for (const p of ['/users', '/audit/log', '/settings', '/accounting', '/reports/outstanding']) {
      expect(canAccessRoute('owner', p)).toBe(true);
    }
  });
  it('blocks cashier from /users, /settings, /reports, /applications', () => {
    expect(canAccessRoute('cashier', '/users')).toBe(false);
    expect(canAccessRoute('cashier', '/settings')).toBe(false);
    expect(canAccessRoute('cashier', '/reports/outstanding')).toBe(false);
    expect(canAccessRoute('cashier', '/applications')).toBe(false);
    expect(canAccessRoute('cashier', '/accounting')).toBe(true);
    expect(canAccessRoute('cashier', '/payments')).toBe(true);
  });
  it('blocks officers from /settings and /reports but allows /applications', () => {
    expect(canAccessRoute('loan_officer', '/settings')).toBe(false);
    expect(canAccessRoute('loan_officer', '/reports/pl')).toBe(false);
    expect(canAccessRoute('loan_officer', '/applications')).toBe(true);
    expect(canAccessRoute('loan_officer', '/accounting')).toBe(false);
  });
  it('gives branch managers everything except users (audit allowed)', () => {
    expect(canAccessRoute('branch_manager', '/users')).toBe(false);
    expect(canAccessRoute('branch_manager', '/audit')).toBe(true);
    expect(canAccessRoute('branch_manager', '/settings')).toBe(true);
    expect(canAccessRoute('branch_manager', '/reports/pl')).toBe(true);
  });
});

describe('visibleNav', () => {
  it('hides reports and settings from officers and cashiers', () => {
    expect(visibleNav('loan_officer')).not.toContain('reports');
    expect(visibleNav('loan_officer')).not.toContain('settings');
    expect(visibleNav('cashier')).not.toContain('reports');
    expect(visibleNav('cashier')).not.toContain('applications');
    expect(visibleNav('branch_manager')).toContain('reports');
  });
});

describe('can with DB overrides', () => {
  const overrides = {
    owner: ['*'] as string[],
    branch_manager: ['customers.view'] as string[],
    loan_officer: [] as string[],
    cashier: ['customers.view', 'payments.create'] as string[],
  };
  it('uses overrides when present, even when empty', () => {
    expect(can('branch_manager', 'loans.view', overrides)).toBe(false);
    expect(can('branch_manager', 'customers.view', overrides)).toBe(true);
    expect(can('loan_officer', 'customers.view', overrides)).toBe(false);
    expect(can('cashier', 'payments.create', overrides)).toBe(true);
    expect(can('cashier', 'payments.view', overrides)).toBe(false);
  });
  it('falls back to constants when overrides are absent', () => {
    expect(can('branch_manager', 'loans.view')).toBe(true);
    expect(can('branch_manager', 'loans.view', undefined)).toBe(true);
  });
});
