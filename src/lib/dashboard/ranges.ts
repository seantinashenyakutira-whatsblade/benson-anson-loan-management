/**
 * Dashboard range helpers (Phase 11.5).
 * Pure functions: presets -> date bounds, bucketing for the
 * Expected-vs-Actual chart, and range-scoped KPI math.
 * All dates are local YYYY-MM-DD strings.
 */

export type RangeKey = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export interface RangeBounds {
  from: string;
  to: string;
  label: string;
}

export const RANGE_LABELS: Record<RangeKey, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
  custom: 'Custom Range',
};

function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayIso(now = new Date()): string {
  return iso(now);
}

export function getRangeBounds(range: RangeKey, customFrom: string, customTo: string, now = new Date()): RangeBounds {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (range === 'today') {
    const t = iso(now);
    return { from: t, to: t, label: 'Today' };
  }
  if (range === 'week') {
    const dow = (now.getDay() + 6) % 7; // Monday = 0
    const mon = new Date(y, m, now.getDate() - dow);
    const sun = new Date(y, m, now.getDate() - dow + 6);
    return { from: iso(mon), to: iso(sun), label: 'This Week' };
  }
  if (range === 'month') {
    return {
      from: iso(new Date(y, m, 1)),
      to: iso(new Date(y, m + 1, 0)),
      label: 'This Month',
    };
  }
  if (range === 'quarter') {
    const q = Math.floor(m / 3);
    return {
      from: iso(new Date(y, q * 3, 1)),
      to: iso(new Date(y, q * 3 + 3, 0)),
      label: 'This Quarter',
    };
  }
  if (range === 'year') {
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: 'This Year' };
  }
  const from = customFrom || iso(now);
  const to = customTo || from;
  return { from: from <= to ? from : to, to: from <= to ? to : from, label: 'Custom Range' };
}

/** Days between two YYYY-MM-DD dates (inclusive count handled by callers). */
export function spanDays(from: string, to: string): number {
  return Math.max(0, Math.round((new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86400000));
}

export type Granularity = 'hour' | 'day' | 'week';

export function granularityFor(range: RangeKey, from: string, to: string): Granularity {
  if (range === 'today') return 'hour';
  if (range === 'week' || range === 'month') return 'day';
  if (range === 'quarter' || range === 'year') return 'week';
  return spanDays(from, to) <= 31 ? 'day' : 'week';
}

export interface ChartBucket {
  key: string;
  label: string;
  expected: number;
  actual: number;
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function shortDay(d: Date): string {
  return d.toLocaleDateString('en-ZM', { weekday: 'short' });
}

/** Build empty bucket shells for [from, to] at the given granularity. */
export function buildBuckets(from: string, to: string, granularity: Granularity): ChartBucket[] {
  if (granularity === 'hour') {
    return Array.from({ length: 24 }, (_, h) => ({
      key: `h${h}`,
      label: `${String(h).padStart(2, '0')}:00`,
      expected: 0,
      actual: 0,
    }));
  }
  const out: ChartBucket[] = [];
  if (granularity === 'day') {
    for (let d = new Date(from + 'T00:00:00'); iso(d) <= to; d = addDays(d, 1)) {
      out.push({ key: iso(d), label: `${shortDay(d)} ${d.getDate()}`, expected: 0, actual: 0 });
    }
    return out;
  }
  // week buckets starting at `from`
  let start = new Date(from + 'T00:00:00');
  const end = new Date(to + 'T00:00:00');
  while (start <= end) {
    const weekEnd = addDays(start, 6) > end ? end : addDays(start, 6);
    out.push({
      key: iso(start),
      label: `${start.getDate()}/${start.getMonth() + 1}–${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`,
      expected: 0,
      actual: 0,
    });
    start = addDays(start, 7);
  }
  return out;
}

export interface LoanLite {
  id: string;
  branch_id: string | null;
  officer_id: string | null;
  principal_amount: number;
  disbursement_date: string | null;
  created_at: string;
  status: string;
  outstanding_balance: number;
  health: string;
}

export interface PaymentLite {
  loan_id: string;
  amount: number;
  paid_at: string;
}

export interface ScheduleLite {
  loan_id: string;
  due_date: string;
  due_amount: number;
}

export interface KpiInput {
  loans: LoanLite[];
  payments: PaymentLite[];
  schedule: ScheduleLite[];
  from: string;
  to: string;
  branch: string;
  officer: string;
  today: string;
}

export interface RangeKpis {
  disbursed: number;
  collected: number;
  loansCreated: number;
  paymentsReceived: number;
  expected: number;
  shortfall: number;
  collectionRate: number;
  par: number;
  overdueOutstanding: number;
  totalOutstanding: number;
}

function inScope(l: LoanLite, branch: string, officer: string): boolean {
  return (branch === 'all' || l.branch_id === branch) && (officer === 'all' || l.officer_id === officer);
}

const dayOf = (ts: string) => ts.slice(0, 10);

/** Range-scoped KPI math. Money inputs are Kwacha numbers; no rounding applied here. */
export function computeKpis(input: KpiInput): RangeKpis {
  const { loans, payments, schedule, from, to, branch, officer, today } = input;
  const scoped = loans.filter((l) => inScope(l, branch, officer));
  const scopedIds = new Set(scoped.map((l) => l.id));

  const disbursed = scoped
    .filter((l) => l.disbursement_date && l.disbursement_date >= from && l.disbursement_date <= to)
    .reduce((s, l) => s + Number(l.principal_amount), 0);

  const rangePayments = payments.filter(
    (p) => scopedIds.has(p.loan_id) && dayOf(p.paid_at) >= from && dayOf(p.paid_at) <= to,
  );
  const collected = rangePayments.reduce((s, p) => s + Number(p.amount), 0);

  const loansCreated = scoped.filter((l) => dayOf(l.created_at) >= from && dayOf(l.created_at) <= to).length;
  const paymentsReceived = rangePayments.length;

  const expectTo = to < today ? to : today;
  const expected =
    from > expectTo
      ? 0
      : schedule
          .filter((s) => scopedIds.has(s.loan_id) && s.due_date >= from && s.due_date <= expectTo)
          .reduce((sum, s) => sum + Number(s.due_amount), 0);

  const shortfall = Math.max(0, expected - collected);
  const collectionRate = expected > 0 ? Math.round((collected / expected) * 100) : 100;

  const live = scoped.filter((l) => l.status !== 'fully_paid' && l.status !== 'closed');
  const totalOutstanding = live.reduce((s, l) => s + Number(l.outstanding_balance), 0);
  const overdueOutstanding = live
    .filter((l) => l.health === 'overdue' || l.health === 'defaulted')
    .reduce((s, l) => s + Number(l.outstanding_balance), 0);
  const par = totalOutstanding > 0 ? Math.round((overdueOutstanding / totalOutstanding) * 100) : 0;

  return {
    disbursed, collected, loansCreated, paymentsReceived, expected, shortfall,
    collectionRate, par, overdueOutstanding, totalOutstanding,
  };
}

/** Fill bucket shells with expected (due dates) and actual (payment timestamps) sums. */
export function fillBuckets(
  buckets: ChartBucket[],
  granularity: Granularity,
  schedule: ScheduleLite[],
  payments: PaymentLite[],
  loanIds: Set<string>,
  from: string,
  to: string,
): ChartBucket[] {
  const out = buckets.map((b) => ({ ...b }));
  const byKey = new Map(out.map((b) => [b.key, b]));

  if (granularity === 'hour') {
    for (const p of payments) {
      if (!loanIds.has(p.loan_id)) continue;
      const h = new Date(p.paid_at).getHours();
      const b = byKey.get(`h${h}`);
      if (b) b.actual += Number(p.amount);
    }
    return out;
  }

  const bucketKeyFor = (day: string): string | null => {
    if (granularity === 'day') return byKey.has(day) ? day : null;
    // week buckets: find the bucket whose 7-day window contains `day`
    for (const b of out) {
      const start = new Date(b.key + 'T00:00:00');
      const end = new Date(Math.min(start.getTime() + 6 * 86400000, new Date(to + 'T00:00:00').getTime()));
      const d = new Date(day + 'T00:00:00');
      if (d >= start && d <= end) return b.key;
    }
    return null;
  };

  for (const s of schedule) {
    if (!loanIds.has(s.loan_id) || s.due_date < from || s.due_date > to) continue;
    const k = bucketKeyFor(s.due_date);
    if (k) byKey.get(k)!.expected += Number(s.due_amount);
  }
  for (const p of payments) {
    if (!loanIds.has(p.loan_id)) continue;
    const day = dayOf(p.paid_at);
    if (day < from || day > to) continue;
    const k = bucketKeyFor(day);
    if (k) byKey.get(k)!.actual += Number(p.amount);
  }
  return out;
}
