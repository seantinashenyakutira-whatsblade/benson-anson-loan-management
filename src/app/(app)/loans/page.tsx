'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search, Filter, HandCoins } from 'lucide-react';

interface Loan {
  id: string;
  loan_number: string;
  principal_amount: number;
  outstanding_balance: number;
  status: string;
  health: string;
  customers?: { first_name: string; last_name: string };
  loan_products?: { name: string };
  disbursement_date: string | null;
  maturity_date: string | null;
}

const HEALTH_COLORS: Record<string, string> = {
  performing: 'text-success',
  at_risk: 'text-warning',
  overdue: 'text-orange',
  defaulted: 'text-danger',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-text-muted/10 text-text-muted',
  submitted: 'bg-info/10 text-info',
  approved: 'bg-success/10 text-success',
  disbursed: 'bg-accent-primary/10 text-accent-primary',
  performing: 'bg-success/10 text-success',
  at_risk: 'bg-warning/10 text-warning',
  overdue: 'bg-orange/10 text-orange',
  defaulted: 'bg-danger/10 text-danger',
  fully_paid: 'bg-success/10 text-success',
  closed: 'bg-text-muted/10 text-text-muted',
  rejected: 'bg-danger/10 text-danger',
};

export default function LoansPage() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchLoans = async () => {
      let query = supabase
        .from('loans')
        .select('*, customers(first_name, last_name), loan_products(name)')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      if (data) setLoans(data);
      setLoading(false);
    };

    fetchLoans();
  }, [supabase, statusFilter]);

  const filtered = loans.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.loan_number.toLowerCase().includes(q) ||
      l.customers?.first_name.toLowerCase().includes(q) ||
      l.customers?.last_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Loans</h1>
        <Link
          href="/loans/new"
          className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
        >
          <Plus size={16} />
          New Loan
        </Link>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search loans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass py-2.5 pl-9 pr-4 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="disbursed">Disbursed</option>
            <option value="performing">Performing</option>
            <option value="overdue">Overdue</option>
            <option value="defaulted">Defaulted</option>
            <option value="fully_paid">Fully Paid</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          headline="No loans yet"
          message="Create your first loan application once a customer is registered."
          actionLabel="New loan application"
          actionHref="/loans/new"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((loan) => (
            <Link
              key={loan.id}
              href={`/loans/${loan.id}`}
              className="glass-card glass-card-hover block p-4 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">{loan.loan_number}</h3>
                  <p className="text-sm text-text-secondary">
                    {loan.customers?.first_name} {loan.customers?.last_name}
                  </p>
                  <p className="text-xs text-text-muted">{loan.loan_products?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-primary">{formatKwacha(loan.principal_amount)}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[loan.status] || 'bg-text-muted/10 text-text-muted'}`}>
                    {loan.status.replace('_', ' ')}
                  </span>
                  {loan.health && loan.health !== 'performing' && (
                    <p className={`mt-1 text-xs font-medium capitalize ${HEALTH_COLORS[loan.health] || ''}`}>
                      {loan.health.replace('_', ' ')}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
