'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { formatKwacha } from '@/lib/money';
import { Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

interface LoanInfo {
  id: string;
  loan_number: string;
  outstanding_balance: number;
  total_repayable: number;
  amount_paid: number;
  customers?: { id: string; first_name: string; last_name: string };
  loan_schedule?: Array<{
    id: string;
    instalment_number: number;
    due_date: string;
    due_amount: number;
    paid_amount: number;
    remaining: number;
    status: string;
  }>;
}

export default function RecordPaymentPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { can } = usePermissions();
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
    if (!loan || !user) return;
    setSubmitting(true);

    const amount = Number(formData.get('amount'));
    const { data: paymentNumber, error: numError } = await supabase.rpc('rpc_generate_payment_number');
    if (numError || !paymentNumber) {
      setSubmitting(false);
      alert('Error generating payment number: ' + numError?.message);
      return;
    }

    const paymentData = {
      payment_number: paymentNumber as string,
      loan_id: loan.id,
      customer_id: loan.customers?.id,
      amount,
      payment_method: formData.get('payment_method') as string,
      reference_number: (formData.get('reference_number') as string) || null,
      paid_at: formData.get('payment_date') as string,
      notes: (formData.get('notes') as string) || null,
      recorded_by: user.id,
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
      const allocAmount = Math.min(remaining, instalment.remaining);
      if (allocAmount > 0) {
        allocations.push({
          payment_id: payment.id,
          loan_id: loan.id,
          schedule_id: instalment.id,
          amount: allocAmount,
          component: 'principal' as const,
        });
        remaining = Math.round((remaining - allocAmount) * 100) / 100;
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
  if (!can('payments.create')) return <div className="py-12 text-center text-text-muted">Your role cannot record payments.</div>;

  const unpaidInstalments = (loan.loan_schedule || [])
    .filter((s) => s.status !== 'paid')
    .sort((a, b) => a.instalment_number - b.instalment_number);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </Button>

      <Surface className="p-6">
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
            <span className="text-success">{formatKwacha(loan.amount_paid)}</span>
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
                    {formatKwacha(s.remaining)} due
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form action={handlePayment} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Amount (K) *" name="amount" type="number" step="0.01" required min="0.01" max={loan.outstanding_balance} />
            <Input label="Payment Date *" name="payment_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Method *" name="payment_method" required>
              <option value="cash">Cash</option>
              <option value="airtel_money">Airtel Money</option>
              <option value="mtn_mobile_money">MTN MoMo</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </Select>
            <Input label="Reference Number" name="reference_number" />
          </div>

          <Textarea label="Notes" name="notes" rows={2} />

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full px-4 py-3 font-medium"
          >
            {submitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </form>
      </Surface>
    </div>
  );
}
