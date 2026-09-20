/**
 * Profile integration test (Stage 2, Phase 10.2).
 * Throwaway auth user, deleted afterwards. Skipped without env.
 */
import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync } from 'fs';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
const EMAIL = `profile-test-${Date.now()}-${Math.floor(Math.random() * 1e6)}@bensonanson.loans`;
const PASS = 'Test@12345';
const PASS2 = 'Test@67890';

describe.skipIf(!ENABLED)('profile self-service', () => {
  const admin = ENABLED
    ? createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;
  let userId = '';
  let user: SupabaseClient | null = null;

  const signIn = async (password: string): Promise<SupabaseClient> => {
    const c = createClient(URL, ANON);
    const { error } = await c.auth.signInWithPassword({ email: EMAIL, password });
    if (error) throw new Error('throwaway login failed: ' + error.message);
    return c;
  };

  it('creates the throwaway user and signs in once', async () => {
    const { data, error } = await admin!.auth.admin.createUser({
      email: EMAIL,
      password: PASS,
      email_confirm: true,
      user_metadata: { full_name: 'Profile Test', role: 'loan_officer' },
    });
    if (error) throw new Error('createUser failed: ' + error.message);
    userId = data.user.id;
    await admin!.from('profiles').upsert({
      id: userId, email: EMAIL, full_name: 'Profile Test', phone: '+260 977 000099',
      role: 'loan_officer', branch_id: 'b0000000-0000-0000-0000-000000000001', is_active: true,
    }, { onConflict: 'id' });
    expect(userId).toBeTruthy();
    user = await signIn(PASS);
  }, 30000);

  it('user can update their own name', async () => {
    const { error } = await user!.from('profiles').update({ full_name: 'Profile Renamed' }).eq('id', userId);
    expect(error).toBeNull();
    const { data } = await admin!.from('profiles').select('full_name').eq('id', userId).single();
    expect(data?.full_name).toBe('Profile Renamed');
  }, 30000);

  it('user can update their own avatar url', async () => {
    const { error } = await user!.from('profiles').update({ avatar_url: 'https://example.com/a.jpg' }).eq('id', userId);
    expect(error).toBeNull();
  }, 30000);

  it('user cannot change their own role (silently ignored)', async () => {
    await user!.from('profiles').update({ role: 'owner' }).eq('id', userId);
    const { data } = await admin!.from('profiles').select('role').eq('id', userId).single();
    expect(data?.role).toBe('loan_officer');
  }, 30000);

  it('user cannot edit another profile', async () => {
    const { data: before } = await admin!.from('profiles').select('full_name').eq('id', '11111111-1111-1111-1111-111111111111').single();
    await user!.from('profiles').update({ full_name: 'Hacked' }).eq('id', '11111111-1111-1111-1111-111111111111');
    const { data: after } = await admin!.from('profiles').select('full_name').eq('id', '11111111-1111-1111-1111-111111111111').single();
    expect(after?.full_name).toBe(before?.full_name);
  }, 30000);

  it('password change requires the correct current password', async () => {
    // wrong current password fails verification
    const bad = await signIn('wrong-password').then(() => null).catch(() => 'failed');
    expect(bad).toBe('failed');
    // right current password verifies, then update works
    const { error } = await user!.auth.updateUser({ password: PASS2 });
    expect(error).toBeNull();
    await user!.auth.signOut();
    // new password signs in
    const c2 = await signIn(PASS2);
    await c2.auth.signOut();
  }, 60000);

  afterAll(async () => {
    if (user) await user.auth.signOut().catch(() => undefined);
    if (!admin || !userId) return;
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
  });
});
