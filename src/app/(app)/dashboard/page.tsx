'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { formatKwacha } from '@/lib/money';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Activity,
  DollarSign,
  Inbox,
  Percent,
  Receipt,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  RANGE_LABELS,
  buildBuckets,
  computeKpis,
  fillBuckets,
  getRangeBounds,
  granularityFor,
  todayIso,
  type LoanLite,
  type PaymentLite,
  type RangeKey,
  type ScheduleLite,
} from '@/lib/dashboard/ranges';

const PRESETS: RangeKey[] = ['today', 'week', 'month', 'quarter', 'year'];

interface Branch {
  id: string;
  name: string;
}

interface Officer {
  id: string;
  full_name: string;
  branch_id: string | null;
}

export default function DashboardPage() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: true, refetchInterval: 60_000 },
        },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <Suspense fallback={<div className="py-12 text-center text-text-muted">Loading...</div>}>
        <DashboardContent />
      </Suspense>
    </QueryClientProvider>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [range, setRange] = useState<RangeKey>(() => (searchParams.get('range') as RangeKey) || 'month');
  const [customFrom, setCustomFrom] = useState(() => searchParams.get('from') ?? '');
  const [customTo, setCustomTo] = useState(() => searchParams.get('to') ?? '');
  const [branch, setBranch] = useState(() => searchParams.get('branch') ?? 'all');
  const [officer, setOfficer] = useState(() => searchParams.get('officer') ?? 'all');

  const bounds = getRangeBounds(range, customFrom, customTo);
  const today = todayIso();
  const expectTo = bounds.to < today ? bounds.to : today;

  function sync(next: { range: RangeKey; from: string; to: string; branch: string; officer: string }) {
    setRange(next.range);
    if (next.range === 'custom') {
      setCustomFrom(next.from);
      setCustomTo(next.to);
    }
    setBranch(next.branch);
    setOfficer(next.officer);
    const q = new URLSearchParams({ range: next.range, branch: next.branch, officer: next.officer });
    if (next.range === 'custom') {
      if (next.from) q.set('from', next.from);
      if (next.to) q.set('to', next.to);
    }
    router.replace(`/dashboard?${q.toString()}`);
  }

  const query = useQuery({
    queryKey: ['dashboard', bounds.from, bounds.to, branch, officer],
    queryFn: async () => {
      const [loansRes, payRes, schedRes, branchesRes, officersRes, verifRes] = await Promise.all([
        supabase
          .from('loans')
          .select('id,branch_id,officer_id,principal_amount,disbursement_date,created_at,status,outstanding_balance,health'),
        supabase
          .from('payments')
          .select('loan_id,amount,paid_at,payment_number')
          .eq('status', 'verified')
          .gte('paid_at', `${bounds.from}T00:00:00`)
          .lte('paid_at', `${bounds.to}T23:59:59`),
        supabase
          .from('loan_schedule')
          .select('loan_id,due_date,due_amount')
          .gte('due_date', bounds.from)
          .lte('due_date', expectTo),
        supabase.from('branches').select('id,name').eq('is_active', true).order('name'),
        supabase.from('profiles').select('id,full_name,branch_id').eq('role', 'loan_officer'),
        supabase.from('customer_invitations').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      ]);
      if (loansRes.error) throw new Error(loansRes.error.message);
      if (payRes.error) throw new Error(payRes.error.message);
      if (schedRes.error) throw new Error(schedRes.error.message);
      return {
        loans: (loansRes.data ?? []) as unknown as LoanLite[],
        payments: (payRes.data ?? []) as unknown as PaymentLite[],
        schedule: (schedRes.data ?? []) as unknown as ScheduleLite[],
        recent: ((payRes.data ?? []) as Array<PaymentLite & { payment_number: string }>)
          .slice()
          .sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1))
          .slice(0, 10),
        branches: (branchesRes.data ?? []) as Branch[],
        officers: (officersRes.data ?? []) as Officer[],
        pendingVerification: verifRes.count ?? 0,
      };
    },
  });

  const data = query.data;
  const kpis = useMemo(
    () =>
      data
        ? computeKpis({
            loans: data.loans,
            payments: data.payments,
            schedule: data.schedule,
            from: bounds.from,
            to: bounds.to,
            branch,
            officer,
            today,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, bounds.from, bounds.to, branch, officer],
  );

  const granularity = granularityFor(range, bounds.from, bounds.to);
  const scopedIds = useMemo(() => {
    if (!data) return new Set<string>();
    return new Set(data.loans.filter((l) => (branch === 'all' || l.branch_id === branch) && (officer === 'all' || l.officer_id === officer)).map((l) => l.id));
  }, [data, branch, officer]);

  const buckets = useMemo(() => {
    if (!data) return [];
    const shells = buildBuckets(bounds.from, bounds.to, granularity);
    if (granularity === 'hour') {
      return fillBuckets(shells, granularity, [], data.payments, scopedIds, bounds.from, bounds.to);
    }
    return fillBuckets(shells, granularity, data.schedule, data.payments, scopedIds, bounds.from, bounds.to);
  }, [data, granularity, scopedIds, bounds.from, bounds.to]);

  const expectedTotal = useMemo(
    () => (granularity === 'hour' && data ? data.schedule.filter((s) => scopedIds.has(s.loan_id)).reduce((sum, s) => sum + Number(s.due_amount), 0) : 0),
    [granularity, data, scopedIds],
  );
  const maxBucket = Math.max(1, ...buckets.flatMap((b) => [b.expected, b.actual]));

  const myBranch = profile?.branch_id ?? null;
  const branchOptions = useMemo(() => {
    if (!data) return [];
    if (profile?.role === 'owner') return data.branches;
    return data.branches.filter((b) => b.id === myBranch);
  }, [data, profile?.role, myBranch]);
  const showBranch = profile?.role === 'owner' || profile?.role === 'branch_manager';
  const showOfficer = profile?.role === 'owner' || profile?.role === 'branch_manager';
  const officerOptions = useMemo(() => {
    if (!data) return [];
    const pool = branch === 'all' ? data.officers : data.officers.filter((o) => o.branch_id === branch);
    if (profile?.role === 'owner') return pool;
    return pool.filter((o) => o.branch_id === myBranch);
  }, [data, branch, profile?.role, myBranch]);

  const showVerification =
    (profile?.role === 'owner' || profile?.role === 'branch_manager' || profile?.role === 'loan_officer') &&
    (data?.pendingVerification ?? 0) > 0;

  const updatedAt = query.dataUpdatedAt ? new Date(query.dataUpdatedAt).toLocaleTimeString('en-ZM') : null;

  const cards = kpis
    ? [
        { label: `Disbursed (${bounds.label})`, value: formatKwacha(kpis.disbursed), icon: ArrowUpRight, color: 'text-info', link: `/loans?range=${range}` },
        { label: `Collected (${bounds.label})`, value: formatKwacha(kpis.collected), icon: ArrowDownRight, color: 'text-success', link: `/payments?range=${range}` },
        { label: 'Loans Created', value: kpis.loansCreated.toLocaleString(), icon: TrendingUp, color: 'text-accent-primary', link: `/loans?range=${range}` },
        { label: 'Payments Received', value: kpis.paymentsReceived.toLocaleString(), icon: Receipt, color: 'text-success', link: `/payments?range=${range}` },
        { label: 'Expected to Date', value: formatKwacha(kpis.expected), icon: DollarSign, color: 'text-warning', link: `/dashboard/collections?range=${range}` },
        { label: 'Collection Shortfall', value: formatKwacha(kpis.shortfall), icon: AlertTriangle, color: 'text-danger', link: `/dashboard/collections?range=${range}` },
        { label: 'Collection Rate', value: `${kpis.collectionRate}%`, icon: Percent, color: kpis.collectionRate >= 90 ? 'text-success' : kpis.collectionRate >= 70 ? 'text-warning' : 'text-danger', link: `/dashboard/collections?range=${range}` },
        { label: 'Portfolio at Risk', value: `${kpis.par}%`, icon: Activity, color: kpis.par <= 5 ? 'text-success' : kpis.par <= 15 ? 'text-warning' : 'text-danger', link: `/dashboard/health?range=${range}` },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">
          Anson Benson Cash Solutions — {bounds.label}
          {updatedAt ? ` · Updated ${updatedAt}` : ''}
          {query.isFetching ? ' · Refreshing…' : ''}
        </p>
      </div>

      {/* Filter bar */}
      <div className="glass-card flex flex-wrap items-center gap-2 p-3">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => sync({ range: p, from: customFrom, to: customTo, branch, officer })}
            className={`rounded-[var(--radius-button)] px-3 py-2 text-sm ${
              range === p ? 'bg-accent-primary font-medium text-accent-on-primary' : 'border border-border-subtle text-text-secondary hover:bg-surface-glass'
            }`}
          >
            {RANGE_LABELS[p]}
          </button>
        ))}
        <button
          onClick={() => sync({ range: 'custom', from: customFrom || bounds.from, to: customTo || bounds.to, branch, officer })}
          className={`rounded-[var(--radius-button)] px-3 py-2 text-sm ${
            range === 'custom' ? 'bg-accent-primary font-medium text-accent-on-primary' : 'border border-border-subtle text-text-secondary hover:bg-surface-glass'
          }`}
        >
          Custom Range
        </button>
        {range === 'custom' && (
          <>
            <input type="date" value={customFrom} onChange={(e) => sync({ range, from: e.target.value, to: customTo, branch, officer })} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2 text-sm text-text-primary" aria-label="Custom from" />
            <input type="date" value={customTo} onChange={(e) => sync({ range, from: customFrom, to: e.target.value, branch, officer })} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2 text-sm text-text-primary" aria-label="Custom to" />
          </>
        )}
        {showBranch && (
          <select value={branch} onChange={(e) => sync({ range, from: customFrom, to: customTo, branch: e.target.value, officer: 'all' })} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2 text-sm text-text-primary" aria-label="Branch filter">
            {profile?.role === 'owner' && <option value="all">All branches</option>}
            {branchOptions.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        {showOfficer && (
          <select value={officer} onChange={(e) => sync({ range, from: customFrom, to: customTo, branch, officer: e.target.value })} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2 text-sm text-text-primary" aria-label="Officer filter">
            <option value="all">All officers</option>
            {officerOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.full_name}</option>
            ))}
          </select>
        )}
        <button
          onClick={() => query.refetch()}
          className="flex items-center gap-1 rounded-[var(--radius-button)] border border-border-subtle px-3 py-2 text-sm text-text-secondary hover:bg-surface-glass"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {showVerification && (
        <Link href="/invitations?status=submitted" className="glass-card glass-card-hover flex items-center gap-3 p-4 transition-all">
          <Inbox size={20} className="text-warning" />
          <p className="text-sm text-text-primary">
            <strong>{data!.pendingVerification}</strong> application{data!.pendingVerification === 1 ? '' : 's'} awaiting verification
          </p>
        </Link>
      )}

      {query.isPending ? (
        <div className="grid grid-cols-2 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface-glass" />
          ))}
        </div>
      ) : query.isError ? (
        <div className="glass-card p-6 text-center">
          <p className="text-sm text-danger">Couldn&apos;t load dashboard data.</p>
          <button onClick={() => query.refetch()} className="mt-3 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary">
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {cards.map((kpi) => (
              <Link key={kpi.label} href={kpi.link} className="glass-card glass-card-hover p-4 transition-all">
                <div className="flex items-start justify-between">
                  <kpi.icon size={20} className={kpi.color} />
                </div>
                <p className="mt-2 text-xl font-bold tabular-nums text-text-primary">{kpi.value}</p>
                <p className="text-xs text-text-muted">{kpi.label}</p>
              </Link>
            ))}
          </div>

          {/* Expected vs Actual */}
          <div className="glass-card p-4">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-text-secondary">Expected vs Actual</h2>
              {granularity === 'hour' && <p className="text-xs text-text-muted">Expected today: {formatKwacha(expectedTotal)}</p>}
            </div>
            {buckets.length === 0 ? (
              <p className="py-6 text-center text-sm text-text-muted">No data in this range.</p>
            ) : (
              <>
                <div className="flex h-40 items-end gap-1">
                  {buckets.map((b) => (
                    <div key={b.key} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-0.5" title={`${b.label}: expected ${formatKwacha(b.expected)}, actual ${formatKwacha(b.actual)}`}>
                      <div className="flex w-full max-w-8 flex-1 items-end justify-center gap-0.5">
                        <div className="w-1/2 rounded-t bg-warning/70" style={{ height: `${Math.max(2, (b.expected / maxBucket) * 100)}%` }} />
                        <div className="w-1/2 rounded-t bg-success/80" style={{ height: `${Math.max(2, (b.actual / maxBucket) * 100)}%` }} />
                      </div>
                      <span className="w-full truncate text-center text-[9px] text-text-muted">{b.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex gap-4 text-[11px] text-text-muted">
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-warning/70" /> Expected</span>
                  <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-sm bg-success/80" /> Actual</span>
                </div>
              </>
            )}
          </div>

          {/* Recent activity in range */}
          <div className="glass-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-secondary">Recent Payments ({bounds.label})</h2>
              <Link href="/payments" className="text-xs text-accent-primary hover:underline">View All</Link>
            </div>
            {!data || data.recent.length === 0 ? (
              <p className="text-sm text-text-muted">No payments in this range.</p>
            ) : (
              <div className="space-y-2">
                {data.recent.map((p) => (
                  <div key={`${p.loan_id}-${p.paid_at}`} className="flex items-center justify-between rounded-xl border border-border-subtle/50 p-3">
                    <div>
                      <p className="text-sm text-text-primary">{(p as { payment_number?: string }).payment_number ?? 'Payment'}</p>
                      <p className="text-xs text-text-muted">{p.paid_at.slice(0, 10)}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-success">{formatKwacha(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
