import { describe, it, expect } from 'vitest';
import { parseReportParams, resolveScope, type ReportUser } from '@/lib/reports/types';

describe('parseReportParams', () => {
  it('parses valid params', () => {
    const p = parseReportParams(new URLSearchParams('from=2026-01-01&to=2026-01-31&branch=b1&officer=o1&status=overdue'));
    expect(p).toEqual({ from: '2026-01-01', to: '2026-01-31', branchId: 'b1', officerId: 'o1', status: 'overdue' });
  });
  it('falls back to current month on missing or malformed input', () => {
    const p = parseReportParams(new URLSearchParams('from=banana&to=13-99'));
    expect(p.from).toMatch(/^\d{4}-\d{2}-01$/);
    expect(p.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(p.branchId).toBe('all');
    expect(p.status).toBe('all');
  });
});

describe('resolveScope', () => {
  const owner: ReportUser = { id: 'u1', name: 'O', role: 'owner', branchId: null };
  const manager: ReportUser = { id: 'u2', name: 'M', role: 'branch_manager', branchId: 'b1' };
  const officer: ReportUser = { id: 'u3', name: 'P', role: 'loan_officer', branchId: 'b1' };
  const base = { from: '2026-09-01', to: '2026-09-30', branchId: 'b2', officerId: 'o9', status: 'all' };

  it('lets owners filter freely', () => {
    expect(resolveScope(owner, base)).toEqual({ branchId: 'b2', officerId: 'o9' });
  });
  it('pins managers to their branch but allows officer filter', () => {
    expect(resolveScope(manager, base)).toEqual({ branchId: 'b1', officerId: 'o9' });
  });
  it('pins loan officers to themselves', () => {
    expect(resolveScope(officer, base)).toEqual({ branchId: 'b1', officerId: 'u3' });
  });
});
