import { createClient } from '@supabase/supabase-js';

type StaffNotification = {
  userId: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
};

/**
 * Insert in-app notification rows for staff.
 * Uses service_role when called from server (cron/RPC), otherwise anon/authenticated client.
 * Best-effort: failures are swallowed.
 */
export async function insertNotifications(
  supabase: ReturnType<typeof createClient>,
  rows: StaffNotification[],
) {
  if (rows.length === 0) return;
  try {
    await (supabase.from('notifications') as unknown as { insert: (rows: unknown) => Promise<{ error: unknown }> }).insert(
      rows.map((r) => ({
        user_id: r.userId,
        kind: r.kind,
        title: r.title,
        body: r.body ?? null,
        link: r.link ?? null,
      })),
    );
  } catch {
    // best-effort
  }
}

export async function notifyPaymentRecorded(
  supabase: ReturnType<typeof createClient>,
  loanId: string,
  amount: number,
) {
  try {
    const { data: loan } = await supabase.from('loans').select('officer_id').eq('id', loanId).maybeSingle();
    const officerId = (loan as { officer_id?: string } | null)?.officer_id;
    if (!officerId) return;
    await insertNotifications(supabase, [
      {
        userId: officerId,
        kind: 'payment_received',
        title: 'Payment recorded',
        body: `K${Number(amount).toLocaleString('en-ZM')} received for loan ${loanId.slice(0, 8)}`,
        link: `/loans/${loanId}`,
      },
    ]);
  } catch {}
}

export async function notifyApplicationSubmitted(
  supabase: ReturnType<typeof createClient>,
  applicationId: string,
  branchId: string | null,
) {
  try {
    let userIds: string[] = [];
    if (branchId) {
      const { data } = await supabase.from('profiles').select('id').eq('branch_id', branchId).eq('role', 'branch_manager');
      userIds = (data ?? []).map((r) => (r as { id: string }).id);
    }
    if (userIds.length === 0) {
      const { data } = await supabase.from('profiles').select('id').eq('role', 'owner');
      userIds = (data ?? []).map((r) => (r as { id: string }).id);
    }
    await insertNotifications(
      supabase,
      userIds.map((id) => ({
        userId: id,
        kind: 'application_submitted',
        title: 'New application',
        body: 'A loan application was submitted.',
        link: `/applications/${applicationId}`,
      })),
    );
  } catch {}
}

export async function notifyLeadSubmitted(
  supabase: ReturnType<typeof createClient>,
  leadId: string,
) {
  try {
    const { data: owners } = await supabase.from('profiles').select('id').eq('role', 'owner');
    const { data: managers } = await supabase.from('profiles').select('id').eq('role', 'branch_manager');
    const ids = [...(owners ?? []), ...(managers ?? [])].map((r) => (r as { id: string }).id);
    await insertNotifications(
      supabase,
      ids.map((id) => ({
        userId: id,
        kind: 'lead_submitted',
        title: 'New lead',
        body: 'A new lead was captured from the website.',
        link: `/leads/${leadId}`,
      })),
    );
  } catch {}
}
