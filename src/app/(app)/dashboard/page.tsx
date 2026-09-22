'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { formatKwacha } from '@/lib/money';
import { Users, DollarSign, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Inbox } from 'lucide-react';

interface DashboardKPIs {
  totalCustomers: number;
  activeLoans: number;
  totalDisbursed: number;
  totalCollected: number;
  outstandingBalance: number;
  overdueLoans: number;
  overdueAmount: number;
  collectionEfficiency: number;
  parRatio: number;
  newCustomersThisMonth: number;
  loansDisbursedThisMonth: number;
  collectionsThisMonth: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs>({
    totalCustomers: 0,
    activeLoans: 0,
    totalDisbursed: 0,
    totalCollected: 0,
    outstandingBalance: 0,
    overdueLoans: 0,
    overdueAmount: 0,
    collectionEfficiency: 0,
    parRatio: 0,
    newCustomersThisMonth: 0,
    loansDisbursedThisMonth: 0,
    collectionsThisMonth: 0,
  });
  const [recentPayments, setRecentPayments] = useState<RecentActivity[]>([]);
  const [pendingVerification, setPendingVerification] = useState(0);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const supabase = createClient();

  useEffect(() => {
    const fetchDashboard = async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const [
        customersRes,
        activeLoansRes,
        totalDisbursedRes,
        totalCollectedRes,
        outstandingRes,
        overdueRes,
        overdueAmountRes,
        newCustomersRes,
        disbursedThisMonthRes,
        collectionsThisMonthRes,
        recentPaymentsRes,
        verificationRes,
      ] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('loans').select('id', { count: 'exact', head: true }).in('status', ['disbursed', 'performing', 'at_risk', 'overdue']),
        supabase.from('loans').select('principal_amount').in('status', ['disbursed', 'performing', 'at_risk', 'overdue', 'fully_paid', 'closed']),
        supabase.from('payments').select('amount').eq('status', 'verified'),
        supabase.from('loans').select('outstanding_balance').in('status', ['disbursed', 'performing', 'at_risk', 'overdue']),
        supabase.from('loans').select('id', { count: 'exact', head: true }).eq('health', 'overdue'),
        supabase.from('loans').select('outstanding_balance').eq('health', 'overdue'),
        supabase.from('customers').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('loans').select('id', { count: 'exact', head: true }).gte('disbursement_date', monthStart),
        supabase.from('payments').select('amount').eq('status', 'verified').gte('paid_at', monthStart),
        supabase.from('payments').select('id, payment_number, amount, paid_at, status, payment_method').order('paid_at', { ascending: false }).limit(10),
        supabase.from('customer_invitations').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
      ]);

      const totalDisbursed = totalDisbursedRes.data?.reduce((sum, l) => sum + l.principal_amount, 0) || 0;
      const totalCollected = totalCollectedRes.data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const outstandingBalance = outstandingRes.data?.reduce((sum, l) => sum + l.outstanding_balance, 0) || 0;
      const overdueAmount = overdueAmountRes.data?.reduce((sum, l) => sum + l.outstanding_balance, 0) || 0;
      const collectionsThisMonth = collectionsThisMonthRes.data?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const expectedThisMonth = totalDisbursed > 0 ? totalDisbursed * 0.08 : 0;

      setKpis({
        totalCustomers: customersRes.count || 0,
        activeLoans: activeLoansRes.count || 0,
        totalDisbursed,
        totalCollected,
        outstandingBalance,
        overdueLoans: overdueRes.count || 0,
        overdueAmount,
        collectionEfficiency: expectedThisMonth > 0 ? Math.round((collectionsThisMonth / expectedThisMonth) * 100) : 0,
        parRatio: outstandingBalance > 0 ? Math.round((overdueAmount / outstandingBalance) * 100) : 0,
        newCustomersThisMonth: newCustomersRes.count || 0,
        loansDisbursedThisMonth: disbursedThisMonthRes.count || 0,
        collectionsThisMonth,
      });

      setPendingVerification(verificationRes.count || 0);

      if (recentPaymentsRes.data) {        setRecentPayments(recentPaymentsRes.data.map((p) => ({
          id: p.id,
          type: 'payment',
          description: p.payment_number,
          amount: p.amount,
          date: p.paid_at,
          status: p.status,
        })));
      }

      setLoading(false);
    };

    fetchDashboard();
  }, [supabase]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-glass" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-surface-glass" />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Total Customers', value: kpis.totalCustomers.toLocaleString(), icon: Users, color: 'text-accent-primary', link: '/customers' },
    { label: 'Active Loans', value: kpis.activeLoans.toLocaleString(), icon: TrendingUp, color: 'text-success', link: '/loans' },
    { label: 'Total Disbursed', value: formatKwacha(kpis.totalDisbursed), icon: ArrowUpRight, color: 'text-info', link: '/loans' },
    { label: 'Total Collected', value: formatKwacha(kpis.totalCollected), icon: ArrowDownRight, color: 'text-success', link: '/payments' },
    { label: 'Outstanding', value: formatKwacha(kpis.outstandingBalance), icon: DollarSign, color: 'text-warning', link: '/loans' },
    { label: 'Overdue', value: formatKwacha(kpis.overdueAmount), icon: AlertTriangle, color: 'text-danger', link: '/collections' },
  ];

  const showVerification =
    profile?.role === 'owner' || profile?.role === 'branch_manager' || profile?.role === 'loan_officer';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-secondary">Anson Benson Cash Solutions — Overview</p>
      </div>

      {showVerification && pendingVerification > 0 && (
        <Link href="/invitations?status=submitted" className="glass-card glass-card-hover flex items-center gap-3 p-4 transition-all">
          <Inbox size={20} className="text-warning" />
          <p className="text-sm text-text-primary">
            <strong>{pendingVerification}</strong> application{pendingVerification === 1 ? '' : 's'} awaiting verification
          </p>
        </Link>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        {kpiCards.map((kpi) => (
          <Link key={kpi.label} href={kpi.link} className="glass-card glass-card-hover p-4 transition-all">
            <div className="flex items-start justify-between">
              <kpi.icon size={20} className={kpi.color} />
            </div>
            <p className="mt-2 text-xl font-bold text-text-primary">{kpi.value}</p>
            <p className="text-xs text-text-muted">{kpi.label}</p>
          </Link>
        ))}
      </div>

      {/* Performance Metrics */}
      <div className="glass-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-secondary">Performance</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-muted">Collection Efficiency</p>
            <p className={`text-2xl font-bold ${kpis.collectionEfficiency >= 90 ? 'text-success' : kpis.collectionEfficiency >= 70 ? 'text-warning' : 'text-danger'}`}>
              {kpis.collectionEfficiency}%
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">PAR Ratio (30+)</p>
            <p className={`text-2xl font-bold ${kpis.parRatio <= 5 ? 'text-success' : kpis.parRatio <= 15 ? 'text-warning' : 'text-danger'}`}>
              {kpis.parRatio}%
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">New Customers (Month)</p>
            <p className="text-2xl font-bold text-text-primary">{kpis.newCustomersThisMonth}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Loans Disbursed (Month)</p>
            <p className="text-2xl font-bold text-text-primary">{kpis.loansDisbursedThisMonth}</p>
          </div>
        </div>
      </div>

      {/* Recent Payments */}
      <div className="glass-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-secondary">Recent Payments</h2>
          <Link href="/payments" className="text-xs text-accent-primary hover:underline">View All</Link>
        </div>
        {recentPayments.length === 0 ? (
          <p className="text-sm text-text-muted">No recent payments.</p>
        ) : (
          <div className="space-y-2">
            {recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border-subtle/50 p-3">
                <div>
                  <p className="text-sm text-text-primary">{p.description}</p>
                  <p className="text-xs text-text-muted">{p.date?.split('T')[0]}</p>
                </div>
                <span className="text-sm font-semibold text-success">{formatKwacha(p.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
