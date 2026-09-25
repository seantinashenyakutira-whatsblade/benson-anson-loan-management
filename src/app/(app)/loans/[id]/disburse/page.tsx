'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { formatKwacha } from '@/lib/money';
import { Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

interface LoanInfo {
  id: string;
  loan_number: string;
  principal_amount: number;
  total_interest: number;
  total_repayable: number;
  status: string;
  customers?: { id: string; first_name: string; last_name: string };
  loan_products?: { name: string };
}

export default function DisbursePage() {
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
        .select('*, customers(id, first_name, last_name), loan_products(name)')
        .eq('id', params.id)
        .single();
      if (data) setLoan(data);
      setLoading(false);
    };
    fetchLoan();
  }, [params.id, supabase]);

  const handleDisburse = async (formData: FormData) => {
    if (!loan || !user) return;
    setSubmitting(true);

    const { error } = await supabase.rpc('rpc_disburse_loan', {
      p_loan_id: loan.id,
      p_amount: loan.principal_amount,
      p_disbursement_date: formData.get('disbursed_date') as string,
      p_method: formData.get('disbursement_method') as string,
      p_disbursed_by: user.id,
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
  if (!can('loans.disburse')) return <div className="py-12 text-center text-text-muted">Only owners and branch managers can disburse loans.</div>;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </Button>

      <Surface className="p-6">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">Disburse Loan</h1>
        <p className="text-sm text-text-secondary">
          {loan.loan_number} — {loan.customers?.first_name} {loan.customers?.last_name}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border-subtle p-4">
            <p className="text-xs text-text-muted">Principal</p>
            <p className="text-lg font-semibold text-text-primary">{formatKwacha(loan.principal_amount)}</p>
          </div>
          <div className="rounded-xl border border-border-subtle p-4">
            <p className="text-xs text-text-muted">Interest</p>
            <p className="text-lg font-semibold text-text-primary">{formatKwacha(loan.total_interest)}</p>
          </div>
          <div className="rounded-xl border border-border-subtle p-4">
            <p className="text-xs text-text-muted">Total Repayable</p>
            <p className="text-lg font-semibold text-text-primary">{formatKwacha(loan.total_repayable)}</p>
          </div>
        </div>

        <form action={handleDisburse} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Disbursement Date *" name="disbursed_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
            <Select label="Method *" name="disbursement_method" required>
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="airtel_money">Airtel Money</option>
              <option value="mtn_mobile_money">MTN MoMo</option>
            </Select>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={submitting}
            className="w-full px-4 py-3 font-medium"
          >
            {submitting ? 'Disbursing...' : 'Confirm Disbursement'}
          </Button>
        </form>
      </Surface>
    </div>
  );
}
