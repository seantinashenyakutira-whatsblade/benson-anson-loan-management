/**
 * Onboarding integration test (Stage 3, Phase 11.2).
 * Throwaway invitations/submissions/customers, deleted afterwards.
 * Skipped without env.
 */
import { describe, it, expect, afterAll, vi } from 'vitest';
import { readFileSync } from 'fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

vi.setConfig({ testTimeout: 60000, hookTimeout: 60000 });

function loadEnv(): Record<string, string> {
  try {
    const env: Record<string, string> = {};
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (m && m[1]) {
        let v = (m[2] || '').trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        env[m[1]] = v;
      }
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();
const URL = env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY || '';
const ENABLED = Boolean(URL && SERVICE);
const MARK = `099001${String(Math.floor(Math.random() * 900) + 100)}`;

const track = { customers: [] as string[], submissions: [] as string[], invitations: [] as string[] };

function payload(nrc: string, phone: string) {
  return {
    full_name: 'Onboarding Test Person', date_of_birth: '1990-05-01', nrc_or_passport: nrc,
    national_id_type: 'NRC', phone, address: '123 Test Road, Lusaka, Zambia',
    occupation: 'Tester', monthly_income: 5000,
    collateral_type: 'Electronics', collateral_description: 'Integration test laptop, serial TEST123',
    collateral_estimated_value: 8000, collateral_ownership: 'Fully owned',
    loan_amount_requested: 3000, loan_purpose: 'Integration test of the onboarding flow',
    preferred_tenure: '3 months', repayment_source: 'Salary',
    next_of_kin_name: 'Kin Person', next_of_kin_phone: '0990000222',
    consent_credit_check: true, consent_accuracy: true, consent_terms: true,
  };
}

describe.skipIf(!ENABLED)('onboarding RPCs', () => {
  const admin: SupabaseClient | null = ENABLED
    ? createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;
  let officerId = '';
  let ownerId = '';
  let tokenA = '';
  let tokenB = '';
  let submissionA = '';
  let submissionB = '';

  it('resolves staff profiles', async () => {
    const { data: officer } = await admin!.from('profiles').select('id').eq('role', 'loan_officer').limit(1).maybeSingle();
    const { data: owner } = await admin!.from('profiles').select('id').eq('role', 'owner').limit(1).maybeSingle();
    expect(officer?.id).toBeTruthy();
    expect(owner?.id).toBeTruthy();
    officerId = officer!.id;
    ownerId = owner!.id;
  });

  it('generates unique URL-safe 32-char tokens', async () => {
    const a = await admin!.rpc('rpc_create_invitation', { p_officer_id: officerId, p_customer_phone: MARK });
    const b = await admin!.rpc('rpc_create_invitation', { p_officer_id: officerId, p_customer_phone: MARK });
    expect(a.error).toBeNull();
    expect(b.error).toBeNull();
    tokenA = a.data.token;
    tokenB = b.data.token;
    track.invitations.push(a.data.id, b.data.id);
    expect(tokenA).toHaveLength(32);
    expect(tokenA).toMatch(/^[A-Za-z0-9-_]+$/);
    expect(tokenA).not.toBe(tokenB);
    expect(a.data.url).toBe(`/onboard/${tokenA}`);
  });

  it('returns NULL for unknown tokens', async () => {
    const { data, error } = await admin!.rpc('rpc_get_invitation_by_token', { p_token: 'definitely-not-real' });
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('returns invitation summary for valid tokens', async () => {
    const { data, error } = await admin!.rpc('rpc_get_invitation_by_token', { p_token: tokenA });
    expect(error).toBeNull();
    expect(data?.branch?.name).toBeTruthy();
    expect(data?.officer?.name).toBeTruthy();
  });

  it('submits a valid application', async () => {
    const { data, error } = await admin!.rpc('rpc_submit_onboarding', {
      p_token: tokenA, p_data: payload(`99771${MARK.slice(-3)}/11/1`, MARK), p_document_paths: [],
    });
    expect(error).toBeNull();
    expect(data?.submission_id).toBeTruthy();
    submissionA = data.submission_id;
    track.submissions.push(submissionA);
  });

  it('returns NULL for used tokens', async () => {
    const { data, error } = await admin!.rpc('rpc_get_invitation_by_token', { p_token: tokenA });
    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it('rejects underage applicants', async () => {
    const { error } = await admin!.rpc('rpc_submit_onboarding', {
      p_token: tokenB, p_data: { ...payload(`99772${MARK.slice(-3)}/22/2`, MARK), date_of_birth: '2015-01-01' }, p_document_paths: [],
    });
    expect(error?.message).toContain('18 years');
  });

  it('approves: creates customer + collateral, blocks double approval', async () => {
    const { data: customerId, error } = await admin!.rpc('rpc_approve_onboarding', {
      p_submission_id: submissionA, p_verifier_id: ownerId,
    });
    expect(error).toBeNull();
    track.customers.push(customerId);

    const { data: cust } = await admin!.from('customers').select('first_name,last_name').eq('id', customerId).single();
    expect(cust?.first_name).toBe('Onboarding');
    expect(cust?.last_name).toBe('Test Person');
    const { data: coll } = await admin!.from('collateral').select('id').eq('customer_id', customerId);
    expect((coll || []).length).toBe(1);

    const dbl = await admin!.rpc('rpc_approve_onboarding', { p_submission_id: submissionA, p_verifier_id: ownerId });
    expect(dbl.error?.message).toContain('already been processed');
  });

  it('rejects with a stored reason', async () => {
    const { data } = await admin!.rpc('rpc_submit_onboarding', {
      p_token: tokenB, p_data: payload(`99773${MARK.slice(-3)}/33/3`, MARK), p_document_paths: [],
    });
    submissionB = data.submission_id;
    track.submissions.push(submissionB);

    const { error } = await admin!.rpc('rpc_reject_onboarding', {
      p_submission_id: submissionB, p_reason: 'Integration test rejection', p_rejector_id: ownerId,
    });
    expect(error).toBeNull();
    const { data: row } = await admin!.from('onboarding_submissions').select('rejection_reason').eq('id', submissionB).single();
    expect(row?.rejection_reason).toBe('Integration test rejection');
  });

  it('expiry job runs', async () => {
    const { data, error } = await admin!.rpc('rpc_expire_invitations');
    expect(error).toBeNull();
    expect(typeof data).toBe('number');
  });

  afterAll(async () => {
    if (!admin) return;
    if (track.customers.length > 0) {
      const { data: colls } = await admin.from('collateral').select('id').in('customer_id', track.customers);
      const collIds = (colls || []).map((c) => c.id);
      if (collIds.length > 0) {
        await admin.from('collateral_media').delete().in('collateral_id', collIds);
        await admin.from('collateral').delete().in('id', collIds);
      }
      await admin.from('customers').delete().in('id', track.customers);
    }
    if (track.submissions.length > 0) {
      await admin.from('onboarding_documents').delete().in('submission_id', track.submissions);
      await admin.from('onboarding_submissions').delete().in('id', track.submissions);
    }
    if (track.invitations.length > 0) {
      await admin.from('customer_invitations').delete().in('id', track.invitations);
    }
  });
});
