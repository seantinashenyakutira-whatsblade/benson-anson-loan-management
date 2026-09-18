'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { usePermissions } from '@/hooks/use-permissions';
import { formatKwacha } from '@/lib/money';
import { ArrowLeft } from 'lucide-react';

interface ApplicationDetail {
  id: string;
  application_number: string;
  requested_amount: number;
  approved_amount: number | null;
  duration: number;
  duration_unit: string;
  purpose: string | null;
  status: string;
  created_at: string;
  customer_id: string;
  customers?: { id: string; first_name: string; last_name: string; phone: string };
  loan_products?: { name: string; interest_rate: number; interest_type: string };
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [convertedLoanId, setConvertedLoanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [approveAmount, setApproveAmount] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  const { can } = usePermissions();
  const canSubmit = can('applications.submit');
  const canApprove = can('applications.approve');
  const canConvert = can('loans.create');

  useEffect(() => {
    const fetchApp = async () => {
      const { data } = await supabase
        .from('loan_applications')
        .select('*, customers(id, first_name, last_name, phone), loan_products(name, interest_rate, interest_type)')
        .eq('id', params.id)
        .single();
      if (data) {
        setApp(data as unknown as ApplicationDetail);
        setApproveAmount(String(data.requested_amount));
        const { data: loan } = await supabase.from('loans').select('id').eq('application_id', params.id).single();
        if (loan) setConvertedLoanId((loan as { id: string }).id);
      }
      setLoading(false);
    };
    fetchApp();
  }, [params.id, supabase]);

  const refresh = async () => {
    const { data } = await supabase
      .from('loan_applications')
      .select('*, customers(id, first_name, last_name, phone), loan_products(name, interest_rate, interest_type)')
      .eq('id', params.id)
      .single();
    if (data) setApp(data as unknown as ApplicationDetail);
  };

  const doSubmit = async () => {
    if (!confirm('Submit this application for review?')) return;
    setWorking(true);
    const { error } = await supabase.from('loan_applications').update({ status: 'submitted' }).eq('id', params.id);
    if (error) alert('Error: ' + error.message);
    else await refresh();
    setWorking(false);
  };

  const doApprove = async () => {
    if (!user) return;
    if (!confirm(`Approve ${app?.application_number} for K${approveAmount}?`)) return;
    setWorking(true);
    const { error } = await supabase.rpc('rpc_approve_application', {
      p_application_id: params.id,
      p_approved_amount: Number(approveAmount),
      p_decided_by: user.id,
    });
    if (error) alert('Error: ' + error.message);
    else await refresh();
    setWorking(false);
  };

  const doReject = async () => {
    if (!user || !rejectReason.trim()) {
      alert('Enter a rejection reason first.');
      return;
    }
    if (!confirm('Reject this application?')) return;
    setWorking(true);
    const { error } = await supabase.rpc('rpc_reject_application', {
      p_application_id: params.id,
      p_decided_by: user.id,
      p_reason: rejectReason.trim(),
    });
    if (error) alert('Error: ' + error.message);
    else await refresh();
    setWorking(false);
  };

  const doConvert = async () => {
    if (!user) return;
    if (!confirm('This will create an active loan ready for disbursement. Continue?')) return;
    setWorking(true);
    const { data: loanId, error } = await supabase.rpc('rpc_convert_application_to_loan', {
      p_application_id: params.id,
      p_converted_by: user.id,
    });
    setWorking(false);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    router.push(`/loans/${loanId}/disburse`);
  };

  if (loading) return <div className="py-12 text-center text-text-muted">Loading...</div>;
  if (!app) return <div className="py-12 text-center text-text-muted">Application not found.</div>;

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{app.application_number}</h1>
            <Link href={`/customers/${app.customer_id}`} className="text-sm text-accent-primary hover:underline">
              {app.customers?.first_name} {app.customers?.last_name}
            </Link>
            <p className="text-xs text-text-secondary">{app.loan_products?.name} ({app.loan_products?.interest_rate}% {app.loan_products?.interest_type})</p>
          </div>
          <span className="rounded-full bg-surface-glass px-3 py-1 text-xs font-medium capitalize text-text-secondary">
            {app.status.replace('_', ' ')}
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-text-muted">Requested</p>
            <p className="text-lg font-semibold tabular-nums text-text-primary">{formatKwacha(app.requested_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Approved</p>
            <p className="text-lg font-semibold tabular-nums text-text-primary">{app.approved_amount !== null ? formatKwacha(app.approved_amount) : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Term</p>
            <p className="text-lg font-semibold text-text-primary">{app.duration} {app.duration_unit}</p>
          </div>
        </div>
        {app.purpose && <p className="mt-3 text-sm text-text-secondary">Purpose: {app.purpose}</p>}
      </div>

      {convertedLoanId && (
        <Link href={`/loans/${convertedLoanId}`} className="glass-card block p-4 text-sm text-accent-primary hover:underline">
          Already converted — view the loan →
        </Link>
      )}

      {canSubmit && app.status === 'draft' && (
        <button onClick={doSubmit} disabled={working} className="w-full rounded-[var(--radius-button)] bg-accent-primary px-4 py-3 font-medium text-accent-on-primary hover:bg-accent-primary-hover disabled:opacity-50">
          {working ? 'Working...' : 'Submit for Review'}
        </button>
      )}

      {canApprove && (app.status === 'submitted' || app.status === 'under_review') && (
        <div className="glass-card space-y-3 p-6">
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Approved Amount (K)</label>
            <input value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} type="number" step="0.01" min="0.01" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>
          <button onClick={doApprove} disabled={working} className="w-full rounded-[var(--radius-button)] bg-success px-4 py-3 font-medium text-white hover:opacity-90 disabled:opacity-50">
            {working ? 'Working...' : 'Approve Application'}
          </button>
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Rejection Reason</label>
            <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none" />
          </div>
          <button onClick={doReject} disabled={working} className="w-full rounded-[var(--radius-button)] border border-danger/40 px-4 py-3 font-medium text-danger hover:bg-danger/10 disabled:opacity-50">
            {working ? 'Working...' : 'Reject Application'}
          </button>
        </div>
      )}

      {canConvert && app.status === 'approved' && !convertedLoanId && (
        <button onClick={doConvert} disabled={working} className="w-full rounded-[var(--radius-button)] bg-accent-primary px-4 py-3 text-base font-semibold text-accent-on-primary hover:bg-accent-primary-hover disabled:opacity-50">
          {working ? 'Converting...' : 'Convert to Loan →'}
        </button>
      )}
    </div>
  );
}
