import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { createClient } from '@/lib/supabase/server';
import { renderReceiptPdf, type ReceiptData } from '@/components/pdf/ReceiptDoc';

/**
 * GET /api/payments/[id]/receipt
 * RLS-scoped receipt PDF. Cookie auth; the payment must be readable by the
 * caller or the request is rejected. No service-role key involved.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: payment, error } = await sb
      .from('payments')
      .select(`
        id, payment_number, amount, payment_method, reference_number, paid_at, status,
        loans (
          id, loan_number, total_repayable, amount_paid, outstanding_balance,
          first_due_date, maturity_date,
          loan_schedule ( due_date, due_amount, paid_amount, status )
        ),
        customers ( id, first_name, last_name, nrc_number ),
        profiles!payments_recorded_by_fkey ( full_name )
      `)
      .eq('id', id)
      .single();

    // RLS returns no row for out-of-scope payments; treat as not found.
    if (error || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const loan = Array.isArray(payment.loans) ? payment.loans[0] : payment.loans;
    const customer = Array.isArray(payment.customers) ? payment.customers[0] : payment.customers;
    const recorder = Array.isArray(payment.profiles) ? payment.profiles[0] : payment.profiles;
    if (!loan || !customer) {
      return NextResponse.json({ error: 'Payment is missing loan/customer data' }, { status: 409 });
    }

    // Next due date = earliest unpaid schedule row.
    const schedule = (loan.loan_schedule ?? []) as Array<{
      due_date: string;
      due_amount: number;
      paid_amount: number;
      status: string;
    }>;
    const openRows = schedule
      .filter((s) => s.status !== 'paid' && Number(s.due_amount) - Number(s.paid_amount) > 0)
      .sort((a, b) => a.due_date.localeCompare(b.due_date));

    // Arrears = unpaid instalments already past due; next due date = earliest
    // unpaid instalment that is not yet overdue (falls back to oldest unpaid).
    const today = new Date().toISOString().slice(0, 10);
    const overdueRows = openRows.filter((s) => s.due_date < today);
    const upcomingRows = openRows.filter((s) => s.due_date >= today);
    const nextDueDate = (upcomingRows[0] ?? overdueRows[0])?.due_date ?? null;

    // Amount due to date = everything unpaid and already due; arrears = the
    // overdue part of it. Derived from the schedule, not the loan columns,
    // which are not maintained by the payment engine.
    const arrears = overdueRows.reduce(
      (sum, s) => sum + (Number(s.due_amount) - Number(s.paid_amount)),
      0,
    );
    const amountDueToDate = arrears;

    const { data: settings } = await sb
      .from('settings')
      .select('key, value')
      .in('key', ['business_name', 'business_phone', 'business_email']);
    const get = (k: string, fallback: string) => settings?.find((s) => s.key === k)?.value || fallback;

    let logoDataUri: string | null = null;
    try {
      const buf = await readFile(join(process.cwd(), 'public', 'branding', 'logo-light.png'));
      logoDataUri = `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
      logoDataUri = null;
    }

    const data: ReceiptData = {
      receiptNo: payment.payment_number,
      paidAt: payment.paid_at,
      amount: Number(payment.amount),
      method: payment.payment_method,
      reference: payment.reference_number,
      status: payment.status,
      customerName: `${customer.first_name} ${customer.last_name}`,
      nrc: customer.nrc_number,
      loanNumber: loan.loan_number,
      outstandingBalance: Number(loan.outstanding_balance ?? 0),
      nextDueDate,
      amountDueToDate,
      arrears,
      recordedByName: recorder?.full_name || '—',
      businessName: get('business_name', 'Anson Benson Cash Solutions Limited'),
      businessPhone: get('business_phone', ''),
      businessEmail: get('business_email', ''),
      logoDataUri,
    };

    const pdf = await renderReceiptPdf({ ...data, generatedAt: new Date().toISOString() });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${data.receiptNo}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Receipt generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
