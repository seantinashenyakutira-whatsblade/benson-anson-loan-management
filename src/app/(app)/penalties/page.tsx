'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { Search } from 'lucide-react';

interface Penalty {
  id: string;
  penalty_type: string;
  penalty_amount: number;
  penalty_date: string;
  reason: string | null;
  status: string;
  waived: boolean;
  waived_amount: number;
  loans?: { loan_number: string; customers?: { first_name: string; last_name: string } };
}

export default function PenaltiesPage() {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPenalties = async () => {
      let query = supabase
        .from('penalties')
        .select('*, loans(loan_number, customers(first_name, last_name))')
        .order('penalty_date', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      if (data) setPenalties(data);
      setLoading(false);
    };

    fetchPenalties();
  }, [supabase, statusFilter]);

  const filtered = penalties.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.loans?.loan_number.toLowerCase().includes(q) ||
      p.loans?.customers?.first_name.toLowerCase().includes(q) ||
      p.loans?.customers?.last_name.toLowerCase().includes(q) ||
      p.reason?.toLowerCase().includes(q)
    );
  });

  const statusColor = (status: string, waived: boolean) => {
    if (waived) return 'text-info';
    switch (status) {
      case 'active': return 'text-danger';
      case 'waived': return 'text-info';
      case 'paid': return 'text-success';
      default: return 'text-text-muted';
    }
  };

  const totalActive = penalties.filter((p) => p.status === 'active' && !p.waived).reduce((sum, p) => sum + p.penalty_amount - p.waived_amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Penalties</h1>
        <div className="text-right">
          <p className="text-xs text-text-muted">Total Active</p>
          <p className="text-sm font-semibold text-danger">{formatKwacha(totalActive)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search penalties..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="waived">Waived</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No penalties found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((penalty) => (
            <div key={penalty.id} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-text-primary capitalize">{penalty.penalty_type.replace('_', ' ')}</h3>
                  <Link href={`/loans/${penalty.loans?.loan_number}`} className="text-xs text-accent-primary hover:underline">
                    {penalty.loans?.loan_number} — {penalty.loans?.customers?.first_name} {penalty.loans?.customers?.last_name}
                  </Link>
                  {penalty.reason && <p className="mt-1 text-xs text-text-muted">{penalty.reason}</p>}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${statusColor(penalty.status, penalty.waived)}`}>
                    {formatKwacha(penalty.penalty_amount - penalty.waived_amount)}
                  </p>
                  <span className={`text-xs font-medium capitalize ${statusColor(penalty.status, penalty.waived)}`}>
                    {penalty.waived ? 'waived' : penalty.status}
                  </span>
                  <p className="text-xs text-text-muted">{penalty.penalty_date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
