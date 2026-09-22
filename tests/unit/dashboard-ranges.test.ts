import { describe, it, expect } from 'vitest';
import {
  buildBuckets,
  computeKpis,
  fillBuckets,
  getRangeBounds,
  granularityFor,
  spanDays,
  type KpiInput,
} from '@/lib/dashboard/ranges';

// Fixed Tuesday 2026-09-22.
const NOW = new Date(2026, 8, 22, 12, 0, 0);

describe('getRangeBounds', () => {
  it('resolves presets from a fixed date', () => {
    expect(getRangeBounds('today', '', '', NOW)).toEqual({ from: '2026-09-22', to: '2026-09-22', label: 'Today' });
    expect(getRangeBounds('week', '', '', NOW)).toEqual({ from: '2026-09-21', to: '2026-09-27', label: 'This Week' });
    expect(getRangeBounds('month', '', '', NOW)).toEqual({ from: '2026-09-01', to: '2026-09-30', label: 'This Month' });
    expect(getRangeBounds('quarter', '', '', NOW)).toEqual({ from: '2026-07-01', to: '2026-09-30', label: 'This Quarter' });
    expect(getRangeBounds('year', '', '', NOW)).toEqual({ from: '2026-01-01', to: '2026-12-31', label: 'This Year' });
  });

  it('normalises custom ranges', () => {
    expect(getRangeBounds('custom', '2026-09-10', '2026-09-01', NOW)).toEqual({
      from: '2026-09-01',
      to: '2026-09-10',
      label: 'Custom Range',
    });
  });

  it('measures spans', () => {
    expect(spanDays('2026-09-01', '2026-09-30')).toBe(29);
  });
});

describe('granularityFor + buildBuckets', () => {
  it('picks hour/day/week by range', () => {
    expect(granularityFor('today', '2026-09-22', '2026-09-22')).toBe('hour');
    expect(granularityFor('week', '2026-09-21', '2026-09-27')).toBe('day');
    expect(granularityFor('month', '2026-09-01', '2026-09-30')).toBe('day');
    expect(granularityFor('quarter', '2026-07-01', '2026-09-30')).toBe('week');
    expect(granularityFor('custom', '2026-09-01', '2026-09-05')).toBe('day');
    expect(granularityFor('custom', '2026-01-01', '2026-09-22')).toBe('week');
  });

  it('builds the right bucket counts', () => {
    expect(buildBuckets('2026-09-22', '2026-09-22', 'hour')).toHaveLength(24);
    expect(buildBuckets('2026-09-21', '2026-09-27', 'day')).toHaveLength(7);
    expect(buildBuckets('2026-09-01', '2026-09-30', 'day')).toHaveLength(30);
    expect(buildBuckets('2026-07-01', '2026-09-30', 'week').length).toBeGreaterThan(10);
  });
});

function kpiBase(): KpiInput {
  return {
    loans: [
      { id: 'l1', branch_id: 'b1', officer_id: 'o1', principal_amount: 10000, disbursement_date: '2026-09-05', created_at: '2026-09-01T10:00:00', status: 'performing', outstanding_balance: 8000, health: 'performing' },
      { id: 'l2', branch_id: 'b2', officer_id: 'o2', principal_amount: 20000, disbursement_date: '2026-08-10', created_at: '2026-08-01T10:00:00', status: 'overdue', outstanding_balance: 15000, health: 'overdue' },
    ],
    payments: [
      { loan_id: 'l1', amount: 2000, paid_at: '2026-09-10T10:00:00' },
      { loan_id: 'l2', amount: 1000, paid_at: '2026-09-12T10:00:00' },
    ],
    schedule: [
      { loan_id: 'l1', due_date: '2026-09-08', due_amount: 2500 },
      { loan_id: 'l1', due_date: '2026-10-08', due_amount: 2500 },
      { loan_id: 'l2', due_date: '2026-09-15', due_amount: 3000 },
    ],
    from: '2026-09-01',
    to: '2026-09-30',
    branch: 'all',
    officer: 'all',
    today: '2026-09-22',
  };
}

describe('computeKpis', () => {
  it('scopes figures to the range', () => {
    const k = computeKpis(kpiBase());
    expect(k.disbursed).toBe(10000);
    expect(k.collected).toBe(3000);
    expect(k.loansCreated).toBe(1);
    expect(k.paymentsReceived).toBe(2);
    // Expected counts only dues up to today (2026-09-22), not the October instalment.
    expect(k.expected).toBe(5500);
    expect(k.shortfall).toBe(2500);
    expect(k.collectionRate).toBe(Math.round((3000 / 5500) * 100));
  });

  it('scopes by branch and officer', () => {
    expect(computeKpis({ ...kpiBase(), branch: 'b1' }).disbursed).toBe(10000);
    expect(computeKpis({ ...kpiBase(), branch: 'b2' }).disbursed).toBe(0);
    expect(computeKpis({ ...kpiBase(), officer: 'o2' }).collected).toBe(1000);
  });

  it('shows zeros gracefully for empty ranges', () => {
    const k = computeKpis({ ...kpiBase(), from: '2026-01-01', to: '2026-01-31' });
    expect(k.disbursed).toBe(0);
    expect(k.collected).toBe(0);
    expect(k.expected).toBe(0);
    expect(k.shortfall).toBe(0);
    expect(k.loansCreated).toBe(0);
    expect(k.paymentsReceived).toBe(0);
  });

  it('computes PAR from live balances', () => {
    const k = computeKpis(kpiBase());
    expect(k.totalOutstanding).toBe(23000);
    expect(k.overdueOutstanding).toBe(15000);
    expect(k.par).toBe(Math.round((15000 / 23000) * 100));
  });
});

describe('fillBuckets', () => {
  it('attributes expected and actual to day buckets', () => {
    const base = kpiBase();
    const shells = buildBuckets('2026-09-01', '2026-09-30', 'day');
    const filled = fillBuckets(shells, 'day', base.schedule, base.payments, new Set(['l1', 'l2']), '2026-09-01', '2026-09-30');
    const byKey = new Map(filled.map((b) => [b.key, b]));
    expect(byKey.get('2026-09-08')?.expected).toBe(2500);
    expect(byKey.get('2026-09-10')?.actual).toBe(2000);
    expect(byKey.get('2026-09-01')?.expected).toBe(0);
  });

  it('fills hourly actuals for today', () => {
    const shells = buildBuckets('2026-09-22', '2026-09-22', 'hour');
    const filled = fillBuckets(
      shells, 'hour', [], [{ loan_id: 'l1', amount: 500, paid_at: '2026-09-22T09:15:00' }],
      new Set(['l1']), '2026-09-22', '2026-09-22',
    );
    expect(filled[9]!.actual).toBe(500);
  });
});
