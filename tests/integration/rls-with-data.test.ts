/**
 * RLS integration test with live data (Stage 1.5, Fix 4).
 * Runs against the configured Supabase project (reads .env.local directly,
 * never prints secrets). Seeds uniquely-marked rows, asserts per-role
 * visibility, then deletes everything. Skipped when env is absent.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function loadEnv(): Record<string, string> {
  try {
    const env: Record<string, string> = {};
    for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
      const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
      if (m) {
        let v = m[2].trim();
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
const URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
const ENABLED = Boolean(URL && ANON && SERVICE);

const HO = 'b0000000-0000-0000-0000-000000000001';
const KB = 'b0000000-0000-0000-0000-000000000002';
const OFFICER_ID = '33333333-3333-3333-3333-333333333333';
const PRODUCT = 'a0000000-0000-0000-0000-000000000001';

const PASSWORDS: Record<string, string> = {
  'owner@bensonanson.loans': 'Demo@2026',
  'manager@bensonanson.loans': 'Demo@2026',
  'officer@bensonanson.loans': 'Demo@2026',
  'cashier@bensonanson.loans': 'Demo@2026',
};

async function loginAs(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON);
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORDS[email]! });
  if (error) throw new Error(`login failed for ${email}: ${error.message}`);
  return c;
}

async function idsIn(c: SupabaseClient, table: string): Promise<string[]> {
  const { data, error } = await c.from(table).select('id');
  if (error) throw new Error(`${table} select failed: ${error.message}`);
  return ((data || []) as Array<{ id: string }>).map((r) => r.id);
}

describe.skipIf(!ENABLED)('rls with live data', () => {
  const admin = ENABLED ? createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } }) : null;
  let custA = '';
  let custB = '';
  let loanA = '';
  let loanB = '';

  beforeAll(async () => {
    const a = await admin!.from('customers').insert({ first_name: 'Rls', last_name: 'FixA', nrc_number: 'RLSFIX4-A', phone: '0971111111', status: 'active', branch_id: HO }).select('id').single();
    const b = await admin!.from('customers').insert({ first_name: 'Rls', last_name: 'FixB', nrc_number: 'RLSFIX4-B', phone: '0972222222', status: 'active', branch_id: KB }).select('id').single();
    if (a.error || b.error) throw new Error('seed customers failed');
    custA = a.data.id;
    custB = b.data.id;

    const mkLoan = async (customerId: string, branch: string, officer: string | null) => {
      const { data: no } = await admin!.rpc('rpc_generate_loan_number');
      return admin!.from('loans').insert({
        loan_number: no, customer_id: customerId, loan_product_id: PRODUCT, branch_id: branch, officer_id: officer,
        principal_amount: 1000, interest_rate: 0, interest_type: 'flat', total_interest: 0, total_fees: 0,
        total_repayable: 1000, amount_paid: 0, outstanding_balance: 1000,
        duration: 1, duration_unit: 'months', repayment_frequency: 'monthly',
        status: 'disbursed', health: 'performing',
      }).select('id').single();
    };
    const la = await mkLoan(custA, HO, OFFICER_ID);
    const lb = await mkLoan(custB, KB, null);
    if (la.error || lb.error) throw new Error('seed loans failed: ' + la.error?.message + lb.error?.message);
    loanA = la.data.id;
    loanB = lb.data.id;
  }, 60000);

  afterAll(async () => {
    if (!admin) return;
    await admin.from('loans').delete().in('id', [loanA, loanB].filter(Boolean));
    await admin.from('customers').delete().in('id', [custA, custB].filter(Boolean));
    // sweep any stragglers by marker
    const { data: strays } = await admin.from('customers').select('id').like('nrc_number', 'RLSFIX4-%');
    for (const s of strays || []) {
      await admin.from('loans').delete().eq('customer_id', (s as { id: string }).id);
      await admin.from('customers').delete().eq('id', (s as { id: string }).id);
    }
  }, 60000);

  it('manager sees only their branch', async () => {
    const c = await loginAs('manager@bensonanson.loans');
    expect(await idsIn(c, 'customers')).toContain(custA);
    expect(await idsIn(c, 'customers')).not.toContain(custB);
    expect(await idsIn(c, 'loans')).toContain(loanA);
    expect(await idsIn(c, 'loans')).not.toContain(loanB);
    await c.auth.signOut();
  });

  it('owner sees both branches', async () => {
    const c = await loginAs('owner@bensonanson.loans');
    expect(await idsIn(c, 'customers')).toEqual(expect.arrayContaining([custA, custB]));
    expect(await idsIn(c, 'loans')).toEqual(expect.arrayContaining([loanA, loanB]));
    await c.auth.signOut();
  });

  it('loan officer sees own branch loans only', async () => {
    const c = await loginAs('officer@bensonanson.loans');
    expect(await idsIn(c, 'customers')).toContain(custA);
    expect(await idsIn(c, 'customers')).not.toContain(custB);
    expect(await idsIn(c, 'loans')).toContain(loanA);
    expect(await idsIn(c, 'loans')).not.toContain(loanB);
    await c.auth.signOut();
  });

  it('cashier sees own branch customers and no loans by design', async () => {
    const c = await loginAs('cashier@bensonanson.loans');
    expect(await idsIn(c, 'customers')).toContain(custA);
    expect(await idsIn(c, 'customers')).not.toContain(custB);
    // cashiers have no loans SELECT grant (payments-only role)
    expect(await idsIn(c, 'loans')).toHaveLength(0);
    await c.auth.signOut();
  });
});
