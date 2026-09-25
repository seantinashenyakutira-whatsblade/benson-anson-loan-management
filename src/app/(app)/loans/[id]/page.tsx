'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/hooks/use-permissions';
import { formatKwacha } from '@/lib/money';
import { Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar } from 'lucide-react';
import Link from 'next/link';

interface LoanDetail {
  id: string;
  loan_number: string;
  principal_amount: number;
  total_interest: number;
  total_repayable: number;
  amount_paid: number;
  outstanding_balance: number;
  status: string;
  health: string;
  interest_rate: number;
  interest_type: string;
  duration: number;
  duration_unit: string;
  disbursement_date: string | null;
  maturity_date: string | null;
  first_due_date: string | null;
  customers?: { id: string; first_name: string; last_name: string; phone: string };
  loan_products?: { name: string };
  loan_schedule?: Array<{
    id: string;
    instalment_number: number;
    due_date: string;
    due_amount: number;
    principal_due: number;
    interest_due: number;
    paid_amount: number;
    remaining: number;
    status: string;
  }>;
  payments?: Array<{
    id: string;
    payment_number: string;
    paid_at: string;
    amount: number;
    payment_method: string;
    status: string;
  }>;
}

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [loan, setLoan] = useState<LoanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'payments'>('overview');
  const { can } = usePermissions();
  const supabase = createClient();

  useEffect(() => {
    const fetchLoan = async () => {
      const { data } = await supabase
        .from('loans')
        .select('*, customers(id, first_name, last_name, phone), loan_products(name), loan_schedule(*), payments(*)')
        .eq('id', params.id)
        .single();

      if (data) setLoan(data);
      setLoading(false);
    };

    fetchLoan();
  }, [params.id, supabase]);

  if (loading) return <div className="py-12 text-center text-text-muted">Loading...</div>;
  if (!loan) return <div className="py-12 text-center text-text-muted">Loan not found.</div>;

  const progress = loan.total_repayable > 0
    ? Math.round((loan.amount_paid / loan.total_repayable) * 100)
    : 0;

  const statusVariant = (status: string): 'success' | 'warning' | 'orange' | 'danger' | 'neutral' | 'brand' => {
    switch (status) {
      case 'performing': return 'success';
      case 'at_risk': return 'warning';
      case 'overdue': return 'orange';
      case 'defaulted': return 'danger';
      case 'fully_paid': return 'success';
      case 'disbursed': return 'brand';
      default: return 'neutral';
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

  const canDisburse = loan.status === 'approved' && can('loans.disburse');
  const canRecordPayment = ['disbursed', 'performing', 'at_risk', 'overdue'].includes(loan.status) && can('payments.create');

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </Button>

      {/* Header */}
      <Surface className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{loan.loan_number}</h1>
            <p className="text-sm text-text-secondary">
              {loan.customers?.first_name} {loan.customers?.last_name}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant={statusVariant(loan.status)} className="capitalize">
                {loan.status.replace('_', ' ')}
              </Badge>
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
            <span>{formatKwacha(loan.amount_paid)} paid</span>
            <span>{progress}%</span>
            <span>{formatKwacha(loan.total_repayable)} total</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-glass">
            <div
              className="h-full rounded-full bg-accent-primary transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </Surface>

      {/* Tabs */}
      <div className="flex gap-1 rounded-[var(--radius-button)] bg-surface-glass p-1">
        {(['overview', 'schedule', 'payments'] as const).map((tab) => (
          <Button
            key={tab}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-surface-glass-2 text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <Surface className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Loan Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-text-muted">Principal</p>
                <p className="text-lg font-semibold text-text-primary">{formatKwacha(loan.principal_amount)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Interest ({loan.interest_rate}% {loan.interest_type})</p>
                <p className="text-lg font-semibold text-text-primary">{formatKwacha(loan.total_interest)}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Term</p>
                <p className="text-sm text-text-primary">{loan.duration} {loan.duration_unit}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Outstanding Balance</p>
                <p className="text-lg font-semibold text-text-primary">{formatKwacha(loan.outstanding_balance)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {loan.disbursement_date && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">Disbursed</p>
                    <p className="text-sm text-text-primary">{loan.disbursement_date}</p>
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
              {loan.first_due_date && (
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-text-muted" />
                  <div>
                    <p className="text-xs text-text-muted">First Due</p>
                    <p className="text-sm text-text-primary">{loan.first_due_date}</p>
                  </div>
                </div>
              )}
            </div>
          </Surface>

          {/* Customer */}
          {loan.customers && (
            <Surface className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-text-primary">Customer</h2>
              <Link href={`/customers/${loan.customers.id}`} className="text-sm text-accent-primary hover:underline">
                {loan.customers.first_name} {loan.customers.last_name}
              </Link>
              <p className="text-xs text-text-secondary">{loan.customers.phone}</p>
            </Surface>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <Surface className="p-6">
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
                      <td className="py-2 text-right text-text-primary">{formatKwacha(s.due_amount)}</td>
                      <td className="py-2 text-right text-text-secondary">{formatKwacha(s.paid_amount)}</td>
                      <td className="py-2 text-right text-text-primary">{formatKwacha(s.remaining)}</td>
                      <td className={`py-2 font-medium capitalize ${scheduleStatusColor(s.status)}`}>{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Surface>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <Surface className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Payment History</h2>
          {!loan.payments || loan.payments.length === 0 ? (
            <p className="text-sm text-text-muted">No payments recorded.</p>
          ) : (
            <div className="space-y-2">
              {loan.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border-subtle p-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{p.payment_number}</p>
                    <p className="text-xs text-text-muted">{p.paid_at?.split('T')[0]} — {p.payment_method?.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-success">{formatKwacha(p.amount)}</p>
                    <span className="text-xs text-text-muted capitalize">{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Surface>
      )}
    </div>
  );
}
