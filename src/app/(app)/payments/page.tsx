'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { EmptyState } from '@/components/ui/empty-state';
import { Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PaymentMethodIcon } from '@/components/payments/payment-method-icon';
import { Search, Download, Receipt } from 'lucide-react';

interface Payment {
  id: string;
  payment_number: string;
  amount: number;
  paid_at: string;
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
        .order('paid_at', { ascending: false });

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

  const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    switch (status) {
      case 'verified': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'neutral';
    }
  };

  const methodLabel = (method: string) => {
    switch (method) {
      case 'mtn_mobile_money': return 'MTN MoMo';
      case 'airtel_money': return 'Airtel Money';
      case 'bank_transfer': return 'Bank Transfer';
      case 'cash': return 'Cash';
      case 'other': return 'Other';
      default: return method.replace('_', ' ');
    }
  };

  const totalAmount = filtered.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Payments</h1>
        <Button variant="secondary" size="sm" className="flex items-center gap-2">
          <Download size={16} />
          Export
        </Button>
      </div>

      {/* Summary */}
      <Surface className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Total ({filtered.length} payments)</span>
          <span className="text-lg font-bold text-success">{formatKwacha(totalAmount)}</span>
        </div>
      </Surface>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <Input
            type="text"
            placeholder="Search payments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="py-2.5 pl-10 pr-4"
          />
        </div>
        <Select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-4 py-2.5"
        >
          <option value="all">All Methods</option>
          <option value="cash">Cash</option>
          <option value="airtel_money">Airtel Money</option>
          <option value="mtn_mobile_money">MTN MoMo</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="other">Other</option>
        </Select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          headline="No payments yet"
          message="Payments recorded against disbursed loans will appear here."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((payment) => (
            <Surface key={payment.id} className="p-4">
              <div className="flex items-center gap-3">
                <PaymentMethodIcon method={payment.payment_method} size={32} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-text-primary">{payment.payment_number}</h3>
                    <span className="text-sm font-semibold text-success">{formatKwacha(payment.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-text-secondary">
                      {payment.loans?.loan_number} — {payment.loans?.customers?.first_name} {payment.loans?.customers?.last_name}
                    </p>
                    <Badge variant={statusVariant(payment.status)} className="capitalize">
                      {payment.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                    <span>{payment.paid_at?.split('T')[0]}</span>
                    <span className="capitalize">{methodLabel(payment.payment_method)}</span>
                    {payment.reference_number && <span>Ref: {payment.reference_number}</span>}
                  </div>
                </div>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
