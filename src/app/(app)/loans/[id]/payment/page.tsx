'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { ArrowLeft } from 'lucide-react';

interface LoanInfo {
  id: string;
  loan_number: string;
  outstanding_balance: number;
  total_amount: number;
  total_paid: number;
  customers?: { id: string; first_name: string; last_name: string };
  loan_schedule?: Array<{
    id: string;
    instalment_number: number;
    due_date: string;
    total_due: number;
    total_paid: number;
    status: string;
  }>;
}

export default function RecordPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const [loan, setLoan] = useState<LoanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const fetchLoan = async () => {
      const { data } = await supabase
        .from('loans')
        .select('*, customers(id, first_name, last_name), loan_schedule(*)')
        .eq('id', params.id)
        .single();
      if (data) setLoan(data);
      setLoading(false);
    };
    fetchLoan();
  }, [params.id, supabase]);

  const handlePayment = async (formData: FormData) => {
    if (!loan) return;
    setSubmitting(true);

    const amount = Math.round(Number(formData.get('amount')) * 100);
    const paymentData = {
      loan_id: loan.id,
      amount,
      payment_method: formData.get('payment_method') as string,
      reference_number: formData.get('reference_number') as string || null,
      payment_date: formData.get('payment_date') as string,
      notes: formData.get('notes') as string || null,
    };

    const { data: payment, error: payError } = await supabase
      .from('payments')
      .insert(paymentData)
      .select()
      .single();

    if (payError) {
      setSubmitting(false);
      alert('Error: ' + payError.message);
      return;
    }

    // Auto-allocate to earliest unpaid instalments
    let remaining = amount;
    const unpaidSchedule = (loan.loan_schedule || [])
      .filter((s) => s.status !== 'paid')
      .sort((a, b) => a.instalment_number - b.instalment_number);

    const allocations = [];
    for (const instalment of unpaidSchedule) {
      if (remaining <= 0) break;
      const instalmentOwed = instalment.total_due - instalment.total_paid;
      const allocAmount = Math.min(remaining, instalmentOwed);
      if (allocAmount > 0) {
        allocations.push({
          payment_id: payment.id,
          loan_schedule_id: instalment.id,
          amount: allocAmount,
        });
        remaining -= allocAmount;
      }
    }

    if (allocations.length > 0) {
      await supabase.from('payment_allocations').insert(allocations);
    }

    setSubmitting(false);
    router.push(`/loans/${loan.id}`);
  };

  if (loading) return <div className="py-12 text-center text-text-muted">Loading...</div>;
  if (!loan) return <div className="py-12 text-center text-text-muted">Loan not found.</div>;

  const unpaidInstalments = (loan.loan_schedule || [])
    .filter((s) => s.status !== 'paid')
    .sort((a, b) => a.instalment_number - b.instalment_number);

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card p-6">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">Record Payment</h1>
        <p className="text-sm text-text-secondary">
          {loan.loan_number} — {loan.customers?.first_name} {loan.customers?.last_name}
        </p>

        <div className="mt-4 rounded-xl border border-border-subtle p-4">
          <div className="flex justify-between text-sm">
            <span className="text-text-muted">Outstanding Balance</span>
            <span className="font-semibold text-danger">{formatKwacha(loan.outstanding_balance)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-text-muted">Total Paid</span>
            <span className="text-success">{formatKwacha(loan.total_paid)}</span>
          </div>
        </div>

        {/* Pending instalments */}
        {unpaidInstalments.length > 0 && (
          <div className="mt-4">
            <h3 className="mb-2 text-sm font-medium text-text-secondary">Pending Instalments</h3>
            <div className="space-y-1">
              {unpaidInstalments.map((s) => (
                <div key={s.id} className="flex justify-between rounded-lg border border-border-subtle/50 px-3 py-2 text-xs">
                  <span className="text-text-secondary">#{s.instalment_number} — {s.due_date}</span>
                  <span className={s.status === 'overdue' ? 'text-danger' : 'text-text-primary'}>
                    {formatKwacha(s.total_due - s.total_paid)} due
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form action={handlePayment} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Amount (K) *</label>
              <input name="amount" type="number" step="0.01" required min="0.01" max={loan.outstanding_balance / 100} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Payment Date *</label>
              <input name="payment_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Method *</label>
              <select name="payment_method" required className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Reference Number</label>
              <input name="reference_number" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Notes</label>
            <textarea name="notes" rows={2} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[var(--radius-button)] bg-success px-4 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? 'Recording...' : 'Record Payment'}
          </button>
        </form>
      </div>
    </div>
  );
}
