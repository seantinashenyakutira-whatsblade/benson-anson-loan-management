import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = request.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET ?? '';
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // Try to run the penalty assessment RPC if it exists (best-effort)
  try {
    await supabase.rpc('rpc_assess_penalties');
  } catch {
    // ignore if RPC doesn't exist
  }

  // Find loans with at least one overdue instalment (past grace) that are still performing/at_risk
  const { data: overdueLoans, error: loansError } = await supabase
    .from('loans')
    .select('id, loan_number, customer_id, health, status')
    .in('health', ['overdue', 'defaulted'])
    .in('status', ['performing', 'at_risk', 'overdue', 'disbursed']);

  if (loansError) {
    return NextResponse.json({ success: false, error: loansError.message }, { status: 500 });
  }

  let queued = 0;
  let updated = 0;

  for (const loan of overdueLoans ?? []) {
    // Update loan to overdue if not already
    if (loan.status !== 'overdue' && loan.status !== 'defaulted') {
      const { error: updError } = await supabase
        .from('loans')
        .update({ status: 'overdue', health: 'overdue', updated_at: new Date().toISOString() })
        .eq('id', loan.id);
      if (!updError) updated++;
    }

    // Queue overdue notification if not already queued recently (avoid spam: check existing queued for this loan in last 24h)
    const { data: existing } = await supabase
      .from('notification_queue')
      .select('id')
      .eq('template', 'payment_overdue')
      .eq('status', 'queued')
      .contains('payload', { loan_no: loan.loan_number })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (existing && existing.length > 0) continue;

    // Get customer for email
    const { data: customer } = await supabase
      .from('customers')
      .select('id, email, first_name, last_name')
      .eq('id', loan.customer_id)
      .maybeSingle();

    // Get a due date for the payload (earliest overdue instalment)
    const { data: sched } = await supabase
      .from('loan_schedule')
      .select('due_date, due_amount')
      .eq('loan_id', loan.id)
      .eq('status', 'overdue')
      .order('due_date', { ascending: true })
      .limit(1)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      customer_name: customer ? `${customer.first_name} ${customer.last_name}` : 'Customer',
      loan_no: loan.loan_number,
      due_date: (sched as { due_date?: string } | null)?.due_date ?? new Date().toISOString().slice(0, 10),
      amount_due: (sched as { due_amount?: number } | null)?.due_amount ?? 0,
      days_overdue: 0,
    };

    const { error: qError } = await supabase.from('notification_queue').insert({
      recipient_customer_id: loan.customer_id,
      recipient_email: (customer as { email?: string } | null)?.email ?? null,
      channel: 'email',
      template: 'payment_overdue',
      payload,
    });

    if (!qError) queued++;
  }

  return NextResponse.json({ success: true, checked: overdueLoans?.length ?? 0, updated, queued });
}
