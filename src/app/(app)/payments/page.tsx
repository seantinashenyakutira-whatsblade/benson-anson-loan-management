'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { Search, Download } from 'lucide-react';

interface Payment {
  id: string;
  payment_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number: string | null;
  status: string;
  notes: string | null;
  loans?: { loan_number: string; customers?: { first_name: string; last_name: string } };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPayments = async () => {
      let query = supabase
        .from('payments')
        .select('*, loans(loan_number, customers(first_name, last_name))')
        .order('payment_date', { ascending: false });

      if (methodFilter !== 'all') {
        query = query.eq('payment_method', methodFilter);
      }

      const { data } = await query;
      if (data) setPayments(data);
      setLoading(false);
    };

    fetchPayments();
  }, [supabase, methodFilter]);

  const filtered = payments.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.payment_number.toLowerCase().includes(q) ||
      p.loans?.loan_number.toLowerCase().includes(q) ||
      p.loans?.customers?.first_name.toLowerCase().includes(q) ||
      p.loans?.customers?.last_name.toLowerCase().includes(q) ||
      p.reference_number?.toLowerCase().includes(q)
    );
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-success';
      case 'pending': return 'text-warning';
      case 'failed': return 'text-danger';
      default: return 'text-text-muted';
    }
  };

  const methodIcon = (method: string) => {
    switch (method) {
      case 'mobile_money': return '📱';
      case 'bank_transfer': return '🏦';
      case 'cash': return '💵';
      case 'cheque': return '📄';
      default: return '💰';
    }
  };

  const totalAmount = filtered.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Payments</h1>
        <button className="flex items-center gap-2 rounded-[var(--radius-button)] border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:bg-surface-glass">
          <Download size={16} />
          Export
        </button>
      </div>

      {/* Summary */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Total ({filtered.length} payments)</span>
          <span className="text-lg font-bold text-success">{formatKwacha(totalAmount)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="all">All Methods</option>
          <option value="mobile_money">Mobile Money</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="cash">Cash</option>
          <option value="cheque">Cheque</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No payments found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((payment) => (
            <div key={payment.id} className="glass-card p-4">
              <div className="flex items-center gap-3">
                <span className="text-xl">{methodIcon(payment.payment_method)}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-text-primary">{payment.payment_number}</h3>
                    <span className="text-sm font-semibold text-success">{formatKwacha(payment.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-secondary">
                      {payment.loans?.loan_number} — {payment.loans?.customers?.first_name} {payment.loans?.customers?.last_name}
                    </p>
                    <span className={`text-xs font-medium capitalize ${statusColor(payment.status)}`}>
                      {payment.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                    <span>{payment.payment_date}</span>
                    <span className="capitalize">{payment.payment_method.replace('_', ' ')}</span>
                    {payment.reference_number && <span>Ref: {payment.reference_number}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
