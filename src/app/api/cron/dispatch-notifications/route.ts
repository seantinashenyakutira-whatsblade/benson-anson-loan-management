import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/resend';
import { paymentReceived } from '@/lib/email/templates/payment-received';
import { paymentOverdue } from '@/lib/email/templates/payment-overdue';
import { loanApproved } from '@/lib/email/templates/loan-approved';
import { welcome } from '@/lib/email/templates/welcome';

export const dynamic = 'force-dynamic';

const TEMPLATES: Record<string, (payload: Record<string, unknown>) => { subject: string; html: string; text: string }> = {
  payment_received: (p) => paymentReceived(p as never),
  payment_overdue: (p) => paymentOverdue(p as never),
  loan_approved: (p) => loanApproved(p as never),
  welcome: (p) => welcome(p as never),
};

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

  // Fetch business name for templates (fallback handled inside templates)
  let businessName: string | undefined;
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', 'business_name').maybeSingle();
    businessName = (data as { value?: string } | null)?.value ?? undefined;
  } catch {
    businessName = undefined;
  }

  const { data: queued, error } = await supabase
    .from('notification_queue')
    .select('*')
    .eq('status', 'queued')
    .lte('scheduled_for', new Date().toISOString())
    .order('scheduled_for', { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of queued ?? []) {
    try {
      const payload = (row.payload as Record<string, unknown>) ?? {};
      if (!payload.business_name && businessName) payload.business_name = businessName;

      if (row.channel === 'email') {
        const to = row.recipient_email || (payload.recipient_email as string) || (payload.email as string);
        if (!to) {
          await supabase
            .from('notification_queue')
            .update({ status: 'skipped', last_error: 'No recipient email', attempts: (row.attempts ?? 0) + 1 })
            .eq('id', row.id);
          skipped++;
          continue;
        }
        const tpl = TEMPLATES[row.template];
        if (!tpl) {
          await supabase
            .from('notification_queue')
            .update({ status: 'failed', last_error: `Unknown template ${row.template}`, attempts: (row.attempts ?? 0) + 1 })
            .eq('id', row.id);
          failed++;
          continue;
        }
        const email = tpl(payload);
        const result = await sendEmail({ to, subject: email.subject, html: email.html, text: email.text });
        if ((result as { skipped?: boolean }).skipped) {
          await supabase
            .from('notification_queue')
            .update({ status: 'skipped', last_error: (result as { reason?: string }).reason ?? 'Skipped', attempts: (row.attempts ?? 0) + 1 })
            .eq('id', row.id);
          skipped++;
        } else {
          await supabase
            .from('notification_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString(), attempts: (row.attempts ?? 0) + 1 })
            .eq('id', row.id);
          sent++;
        }
      } else if (row.channel === 'push') {
        // OneSignal push (if enabled, otherwise skip)
        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        const apiKey = process.env.ONESIGNAL_REST_API_KEY;
        if (!appId || !apiKey || appId.trim() === '' || apiKey.trim() === '') {
          await supabase
            .from('notification_queue')
            .update({ status: 'skipped', last_error: 'OneSignal not configured', attempts: (row.attempts ?? 0) + 1 })
            .eq('id', row.id);
          skipped++;
          continue;
        }
        // Try to send via OneSignal REST API (best-effort)
        try {
          const payloadForPush = payload as { title?: string; body?: string; link?: string; user_id?: string };
          const resp = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${apiKey}`,
            },
            body: JSON.stringify({
              app_id: appId,
              include_external_user_ids: row.recipient_profile_id ? [row.recipient_profile_id] : undefined,
              headings: { en: payloadForPush.title ?? 'Notification' },
              contents: { en: payloadForPush.body ?? '' },
              url: payloadForPush.link,
            }),
          });
          if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`OneSignal ${resp.status}: ${txt.slice(0, 200)}`);
          }
          await supabase
            .from('notification_queue')
            .update({ status: 'sent', sent_at: new Date().toISOString(), attempts: (row.attempts ?? 0) + 1 })
            .eq('id', row.id);
          sent++;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          const attempts = (row.attempts ?? 0) + 1;
          await supabase
            .from('notification_queue')
            .update({
              status: attempts >= 3 ? 'failed' : 'queued',
              last_error: msg,
              attempts,
              scheduled_for: attempts >= 3 ? row.scheduled_for : new Date(Date.now() + attempts * 5 * 60 * 1000).toISOString(),
            })
            .eq('id', row.id);
          if (attempts >= 3) failed++;
          else skipped++;
        }
      } else {
        await supabase
          .from('notification_queue')
          .update({ status: 'failed', last_error: `Unknown channel ${row.channel}`, attempts: (row.attempts ?? 0) + 1 })
          .eq('id', row.id);
        failed++;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const attempts = (row.attempts ?? 0) + 1;
      await supabase
        .from('notification_queue')
        .update({
          status: attempts >= 3 ? 'failed' : 'queued',
          last_error: msg,
          attempts,
          scheduled_for: attempts >= 3 ? row.scheduled_for : new Date(Date.now() + attempts * 5 * 60 * 1000).toISOString(),
        })
        .eq('id', row.id);
      if (attempts >= 3) failed++;
      else skipped++;
    }
  }

  return NextResponse.json({ success: true, processed: queued?.length ?? 0, sent, failed, skipped });
}
