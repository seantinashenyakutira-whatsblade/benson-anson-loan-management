'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';

interface LoanDetail {
  id: string;
  loan_number: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  total_paid: number;
  outstanding_balance: number;
  status: string;
  health: string;
  interest_rate: number;
  interest_method: string;
  term_count: number;
  term_unit: string;
  disbursed_date: string | null;
  maturity_date: string | null;
  first_payment_date: string | null;
  customers?: { id: string; first_name: string; last_name: string; phone: string };
  loan_products?: { name: string };
  collateral?: Array<{ id: string; description: string; estimated_value: number }>;
  loan_schedule?: Array<{
    id: string;
    instalment_number: number;
    due_date: string;
    principal_due: number;
    interest_due: number;
    total_due: number;
    principal_paid: number;
    interest_paid: number;
    total_paid: number;
    balance_after: number;
    status: string;
  }>;
  payments?: Array<{
    id: string;
    payment_number: string;
    payment_date: string;
    amount: number;
    method: string;
    status: string;
  }>;
}

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'payments'>('overview');
  const supabase = createClient();

  useEffect(() => {
    const fetchLoan = async () => {
      const { data } = await supabase
        .from('loans')
        .select('*, customers(id, first_name, last_name, phone), loan_products(name), collateral(id, description, estimated_value), loan_schedule(*), payments(*)')
        .eq('id', params.id)
        .single();

      if (data) setLoan(data);
      setLoading(false);
    };

    fetchLoan();
  }, [params.id, supabase]);

  if (loading) return <div className="py-12 text-center text-text-muted">Loading...</div>;
  if (!loan) return <div className="py-12 text-center text-text-muted">Loan not found.</div>;

  const progress = loan.total_amount > 0
    ? Math.round((loan.total_paid / loan.total_amount) * 100)
    : 0;

  const statusColor = (status: string) => {
    switch (status) {
      case 'performing': return 'bg-success/10 text-success';
      case 'at_risk': return 'bg-warning/10 text-warning';
      case 'overdue': return 'bg-orange/10 text-orange';
      case 'defaulted': return 'bg-danger/10 text-danger';
      case 'fully_paid': return 'bg-success/10 text-success';
      case 'disbursed': return 'bg-accent-primary/10 text-accent-primary';
      default: return 'bg-text-muted/10 text-text-muted';
    }
  };

  const scheduleStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-success';
      case 'partial': return 'text-warning';
      case 'overdue': return 'text-danger';
      case 'upcoming': return 'text-text-muted';
      default: return 'text-text-secondary';
    }
  };

  const canDisburse = loan.status === 'approved';
  const canRecordPayment = ['disbursed', 'performing', 'at_risk', 'overdue'].includes(loan.status);

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{loan.loan_number}</h1>
            <p className="text-sm text-text-secondary">
              {loan.customers?.first_name} {loan.customers?.last_name}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColor(loan.status)}`}>
                {loan.status.replace('_', ' ')}
              </span>
              {loan.loan_products && (
                <span className="text-xs text-text-muted">{loan.loan_products.name}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {canDisburse && (
              <Link
                href={`/loans/${loan.id}/disburse`}
                className="rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
              >
                Disburse
              </Link>
            )}
            {canRecordPayment && (
              <Link
                href={`/loans/${loan.id}/payment`}
                className="rounded-[var(--radius-button)] bg-success px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Record Payment
              </Link>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-text-muted">
            <span>{formatKwacha(loan.total_paid)} paid</span>
            <span>{progress}%</span>
            <span>{formatKwacha(loan.total_amount)} total</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-glass">
            <div
              className="h-full rounded-full bg-accent-primary transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-[var(--radius-button)] bg-surface-glass p-1">
        {(['overview', 'schedule', 'payments'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-[var(--radius-button)] px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-surface-glass-2 text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Loan Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-text-muted">Principal</p>
                <p className="text-lg font-semibold text-text-primary">{formatKwacha(loan.principal_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Interest ({loan.interest_rate}% {loan.interest_method})</p>
                <p className="text-lg font-semibold text-text-primary">{formatKwacha(loan.interest_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Term</p>
                <p className="text-sm text-text-primary">{loan.term_count} {loan.term_unit}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Outstanding Balance</p>
                <p className="text-lg font-semibold text-text-primary">{formatKwacha(loan.outstanding_balance)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {loan.disbursed_date && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Disbursed</p>
                    <p className="text-sm text-text-primary">{loan.disbursed_date}</p>
                  </div>
                </div>
              )}
              {loan.maturity_date && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Maturity</p>
                    <p className="text-sm text-text-primary">{loan.maturity_date}</p>
                  </div>
                </div>
              )}
              {loan.first_payment_date && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">First Payment</p>
                    <p className="text-sm text-text-primary">{loan.first_payment_date}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Collateral */}
          {loan.collateral && loan.collateral.length > 0 && (
            <div className="glass-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">Collateral</h2>
              <div className="space-y-2">
                {loan.collateral.map((c) => (
                  <Link
                    key={c.id}
                    href={`/collateral/${c.id}`}
                    className="flex items-center justify-between rounded-xl border border-border-subtle p-3 hover:bg-surface-glass"
                  >
                    <span className="text-sm text-text-primary">{c.description}</span>
                    <span className="text-sm text-text-secondary">{formatKwacha(c.estimated_value)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Customer */}
          {loan.customers && (
            <div className="glass-card p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">Customer</h2>
              <Link href={`/customers/${loan.customers.id}`} className="text-sm text-accent-primary hover:underline">
                {loan.customers.first_name} {loan.customers.last_name}
              </Link>
              <p className="text-xs text-text-secondary">{loan.customers.phone}</p>
            </div>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="glass-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Payment Schedule</h2>
          {!loan.loan_schedule || loan.loan_schedule.length === 0 ? (
            <p className="text-sm text-text-muted">No schedule generated.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Due Date</th>
                    <th className="pb-2 font-medium text-right">Due</th>
                    <th className="pb-2 font-medium text-right">Paid</th>
                    <th className="pb-2 font-medium text-right">Balance</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loan.loan_schedule.map((s) => (
                    <tr key={s.id} className="border-b border-border-subtle/50">
                      <td className="py-2 text-text-secondary">{s.instalment_number}</td>
                      <td className="py-2 text-text-primary">{s.due_date}</td>
                      <td className="py-2 text-right text-text-primary">{formatKwacha(s.total_due)}</td>
                      <td className="py-2 text-right text-text-secondary">{formatKwacha(s.total_paid)}</td>
                      <td className="py-2 text-right text-text-primary">{formatKwacha(s.balance_after)}</td>
                      <td className={`py-2 font-medium capitalize ${scheduleStatusColor(s.status)}`}>{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <div className="glass-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Payment History</h2>
          {!loan.payments || loan.payments.length === 0 ? (
            <p className="text-sm text-text-muted">No payments recorded.</p>
          ) : (
            <div className="space-y-2">
              {loan.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border-subtle p-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{p.payment_number}</p>
                    <p className="text-xs text-text-muted">{p.payment_date} — {p.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-success">{formatKwacha(p.amount)}</p>
                    <span className="text-xs text-text-muted capitalize">{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
