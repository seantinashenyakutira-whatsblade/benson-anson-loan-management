'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { ArrowLeft } from 'lucide-react';

interface LoanInfo {
  id: string;
  loan_number: string;
  principal_amount: number;
  interest_amount: number;
  total_amount: number;
  status: string;
  customers?: { id: string; first_name: string; last_name: string };
  loan_products?: { name: string };
}

export default function DisbursePage() {
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
        .select('*, customers(id, first_name, last_name), loan_products(name)')
        .eq('id', params.id)
        .single();
      if (data) setLoan(data);
      setLoading(false);
    };
    fetchLoan();
  }, [params.id, supabase]);

  const handleDisburse = async (formData: FormData) => {
    if (!loan) return;
    setSubmitting(true);

    const { error } = await supabase.rpc('rpc_disburse_loan', {
      p_loan_id: loan.id,
      p_disbursed_date: formData.get('disbursed_date') as string,
      p_disbursement_method: formData.get('disbursement_method') as string,
      p_bank_account: formData.get('bank_account') as string || null,
      p_notes: formData.get('notes') as string || null,
    });

    setSubmitting(false);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    router.push(`/loans/${loan.id}`);
  };

  if (loading) return <div className="py-12 text-center text-text-muted">Loading...</div>;
  if (!loan) return <div className="py-12 text-center text-text-muted">Loan not found.</div>;

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card p-6">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">Disburse Loan</h1>
        <p className="text-sm text-text-secondary">
          {loan.loan_number} — {loan.customers?.first_name} {loan.customers?.last_name}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border-subtle p-4">
            <p className="text-xs text-text-muted">Principal</p>
            <p className="text-lg font-semibold text-text-primary">{formatKwacha(loan.principal_amount)}</p>
          </div>
          <div className="rounded-xl border border-border-subtle p-4">
            <p className="text-xs text-text-muted">Interest</p>
            <p className="text-lg font-semibold text-text-primary">{formatKwacha(loan.interest_amount)}</p>
          </div>
        </div>

        <form action={handleDisburse} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Disbursement Date *</label>
              <input name="disbursed_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Method *</label>
              <select name="disbursement_method" required className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Bank Account (if applicable)</label>
            <input name="bank_account" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Notes</label>
            <textarea name="notes" rows={3} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-[var(--radius-button)] bg-accent-primary px-4 py-3 font-medium text-accent-on-primary hover:bg-accent-primary-hover disabled:opacity-50"
          >
            {submitting ? 'Disbursing...' : 'Confirm Disbursement'}
          </button>
        </form>
      </div>
    </div>
  );
}
