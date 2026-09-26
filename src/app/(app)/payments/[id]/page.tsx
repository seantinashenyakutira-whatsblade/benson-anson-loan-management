'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/hooks/use-permissions';
import { formatKwacha } from '@/lib/money';
import { Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaymentMethodIcon, normalizeMethod } from '@/components/payments/payment-method-icon';
import { ArrowLeft, Download, Receipt } from 'lucide-react';

interface PaymentDetail {
  id: string;
  payment_number: string;
  amount: number;
  paid_at: string;
  payment_method: string;
  reference_number: string | null;
  status: string;
  notes: string | null;
  recorded_by: string;
  loans?: { loan_number: string; outstanding_balance?: number };
  customers?: { first_name: string; last_name: string; nrc_number: string | null; phone: string | null };
  profiles?: { full_name: string } | null;
}

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  airtel_money: 'Airtel Money',
  mtn_mobile_money: 'MTN Mobile Money',
  other: 'Other',
};

export default function PaymentDetailPage() {
  const params = useParams();
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const { can } = usePermissions();
  const supabase = createClient();

  useEffect(() => {
    const fetchPayment = async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, loans(loan_number, outstanding_balance), customers(first_name, last_name, nrc_number, phone), profiles!payments_recorded_by_fkey(full_name)')
        .eq('id', params.id)
        .single();

      if (data) setPayment(data as unknown as PaymentDetail);
      setLoading(false);
    };
    fetchPayment();
  }, [params.id, supabase]);

  const download = async () => {
    if (!payment) return;
    setDownloading(true);
    try {
      const res = await fetch(`/api/payments/${payment.id}/receipt`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Download failed' }));
        alert(body.error || `Receipt download failed (${res.status})`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${payment.payment_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert('Receipt download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-text-muted">Loading...</div>;
  }

  if (!payment) {
    return (
      <div className="py-12 text-center text-text-muted">
        Payment not found.{' '}
        <Link href="/payments" className="text-brand-bright underline">Back to payments</Link>
      </div>
    );
  }

  const method = normalizeMethod(payment.payment_method);
  const methodLabel = METHOD_LABELS[method] ?? String(payment.payment_method).replace(/_/g, ' ');
  const statusVariant = payment.status === 'verified' ? 'success' : payment.status === 'pending' ? 'warning' : 'danger';

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Payment method', value: methodLabel },
    { label: 'Date received', value: payment.paid_at?.split('T')[0] ?? '—' },
    { label: 'Reference', value: payment.reference_number || '—' },
    { label: 'Customer', value: `${payment.customers?.first_name ?? ''} ${payment.customers?.last_name ?? ''}`.trim() || '—' },
    { label: 'Customer NRC', value: payment.customers?.nrc_number || '—' },
    { label: 'Loan number', value: payment.loans?.loan_number ?? '—' },
    { label: 'Outstanding balance', value: payment.loans ? formatKwacha(payment.loans.outstanding_balance ?? 0) : '—' },
    { label: 'Verified by', value: payment.profiles?.full_name || '—' },
    { label: 'Notes', value: payment.notes || '—' },
  ];

  return (
    <div className="space-y-4">
      <Link href="/payments" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} />
        Back to payments
      </Link>

      <Surface className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <PaymentMethodIcon method={payment.payment_method} size={40} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-text-primary">{payment.payment_number}</h1>
                <Badge variant={statusVariant as 'success' | 'warning' | 'danger'} className="capitalize">
                  {payment.status}
                </Badge>
              </div>
              <p className="text-sm text-text-muted">Official receipt</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-success">{formatKwacha(payment.amount)}</p>
            <p className="text-xs text-text-muted">Amount received</p>
          </div>
        </div>

        {can('receipts.print') && (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={download} disabled={downloading} className="gap-2">
              <Download size={16} />
              {downloading ? 'Preparing…' : 'Download Receipt'}
            </Button>
            <a
              href={`/api/payments/${payment.id}/receipt`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border-default px-4 text-sm font-medium text-text-primary transition-all hover:bg-surface-glass"
            >
              <Receipt size={16} />
              Open in new tab
            </a>
          </div>
        )}
      </Surface>

      <Surface className="p-5">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Details</h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between gap-4 border-b border-border-subtle pb-2">
              <dt className="text-sm text-text-muted">{r.label}</dt>
              <dd className="text-sm font-medium text-text-primary text-right">{r.value}</dd>
            </div>
          ))}
        </dl>
      </Surface>
    </div>
  );
}
