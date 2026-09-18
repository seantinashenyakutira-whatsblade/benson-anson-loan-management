/**
 * Permission matrix integration test (Stage 2, Phase 10.3).
 * Toggles a real permission row off and back on, verifying the RPC
 * readback each way. Always restores. Skipped without env.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

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
const URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY || '';
const ENABLED = Boolean(URL && ANON && SERVICE);

describe.skipIf(!ENABLED)('permission matrix overrides', () => {
  const admin = ENABLED
    ? createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

  const readCashier = async (): Promise<string[]> => {
    const { data, error } = await admin!.rpc('rpc_get_role_permissions', { p_role: 'cashier' });
    if (error) throw new Error('rpc failed: ' + error.message);
    return (data as string[]) || [];
  };

  it('owner can toggle a permission off and on with RPC readback', async () => {
    const before = await readCashier();
    expect(before).toContain('payments.create');

    // toggle OFF: delete the row
    const { data: perm } = await admin!.from('permissions').select('id').eq('code', 'payments.create').single();
    await admin!.from('role_permissions').delete().eq('role', 'cashier').eq('permission_id', (perm as { id: string }).id);
    try {
      const off = await readCashier();
      expect(off).not.toContain('payments.create');
    } finally {
      // toggle ON: restore the row
      await admin!.from('role_permissions').insert({ role: 'cashier', permission_id: (perm as { id: string }).id });
    }
    const after = await readCashier();
    expect(after).toContain('payments.create');
  }, 60000);
});
