'use server';

import { createClient } from '@/lib/supabase/server';
import { getCurrentUser, getUserRole } from '@/lib/auth';

export interface InvitationActionResult {
  ok: boolean;
  error?: string;
  invitation?: { id: string; token: string; url: string; expires_at: string };
  customerId?: string;
}

const STAFF_ROLES = ['owner', 'branch_manager', 'loan_officer'];
const APPROVER_ROLES = ['owner', 'branch_manager'];

async function requireStaff() {
  const role = await getUserRole();
  if (!role || !STAFF_ROLES.includes(role)) {
    throw new Error('Forbidden: staff only.');
  }
  const profile = await getCurrentUser();
  if (!profile) throw new Error('Not signed in.');
  return { role, profile };
}

function fail(e: unknown): InvitationActionResult {
  return { ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' };
}

export async function createInvitation(input: {
  customerName?: string;
  customerPhone?: string;
  expiryHours: number;
}): Promise<InvitationActionResult> {
  try {
    const { profile } = await requireStaff();
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('rpc_create_invitation', {
      p_officer_id: profile.id,
      p_expiry_hours: input.expiryHours,
      p_customer_name: input.customerName?.trim() || null,
      p_customer_phone: input.customerPhone?.trim() || null,
    });
    if (error) throw new Error(error.message);
    await supabase.from('audit_logs').insert({
      actor_id: profile.id,
      action: 'invitation.created',
      entity_type: 'customer_invitation',
      entity_id: data.id,
      after_data: { customer_name: input.customerName ?? null },
    });
    return { ok: true, invitation: data };
  } catch (e) {
    return fail(e);
  }
}

export async function cancelInvitation(invitationId: string): Promise<InvitationActionResult> {
  try {
    const { profile } = await requireStaff();
    const supabase = await createClient();
    const { data: inv } = await supabase.from('customer_invitations').select('id,status').eq('id', invitationId).single();
    if (!inv) return { ok: false, error: 'Invitation not found.' };
    if (inv.status !== 'pending') return { ok: false, error: 'Only pending invitations can be cancelled.' };
    const { error } = await supabase
      .from('customer_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invitationId);
    if (error) throw new Error(error.message);
    await supabase.from('audit_logs').insert({
      actor_id: profile.id,
      action: 'invitation.cancelled',
      entity_type: 'customer_invitation',
      entity_id: invitationId,
      before_data: { status: 'pending' },
      after_data: { status: 'expired' },
    });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function approveSubmission(submissionId: string, note?: string): Promise<InvitationActionResult> {
  try {
    const { role, profile } = await requireStaff();
    if (!APPROVER_ROLES.includes(role)) {
      return { ok: false, error: 'Only branch managers and owners can approve.' };
    }
    const supabase = await createClient();
    if (note?.trim()) {
      await supabase
        .from('onboarding_submissions')
        .update({ verification_note: note.trim() })
        .eq('id', submissionId);
    }
    const { data: customerId, error } = await supabase.rpc('rpc_approve_onboarding', {
      p_submission_id: submissionId,
      p_verifier_id: profile.id,
    });
    if (error) throw new Error(error.message);

    const { data: sub } = await supabase
      .from('onboarding_submissions')
      .select('invitation_id, full_name')
      .eq('id', submissionId)
      .single();
    let officerId: string | null = null;
    if (sub) {
      const { data: inv } = await supabase
        .from('customer_invitations')
        .select('officer_id')
        .eq('id', sub.invitation_id)
        .single();
      officerId = inv?.officer_id ?? null;
    }
    if (officerId) {
      await supabase.from('notifications').insert({
        user_id: officerId,
        title: 'Application approved',
        message: `The application for ${sub?.full_name ?? 'your customer'} was approved.`,
        type: 'success',
        entity_type: 'customer',
        entity_id: customerId,
      });
    }
    return { ok: true, customerId };
  } catch (e) {
    return fail(e);
  }
}

export async function rejectSubmission(submissionId: string, reason: string): Promise<InvitationActionResult> {
  try {
    const { role, profile } = await requireStaff();
    if (!APPROVER_ROLES.includes(role)) {
      return { ok: false, error: 'Only branch managers and owners can reject.' };
    }
    if (!reason.trim()) return { ok: false, error: 'A reason is required.' };
    const supabase = await createClient();
    const { error } = await supabase.rpc('rpc_reject_onboarding', {
      p_submission_id: submissionId,
      p_reason: reason.trim(),
      p_rejector_id: profile.id,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
