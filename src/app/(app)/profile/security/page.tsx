'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { ArrowLeft } from 'lucide-react';

export default function SecurityPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [lastSignIn, setLastSignIn] = useState('');
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email || '');
      setLastSignIn(data.user?.last_sign_in_at ? new Date(data.user.last_sign_in_at).toLocaleString() : '—');
    });
  }, [supabase]);

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.next.length < 8) {
      alert('New password must be at least 8 characters.');
      return;
    }
    if (form.next !== form.confirm) {
      alert('New passwords do not match.');
      return;
    }
    setSaving(true);
    // Verify the current password first by re-authenticating
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: form.current });
    if (verifyError) {
      setSaving(false);
      alert('Current password is incorrect.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: form.next });
    setSaving(false);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    setForm({ current: '', next: '', confirm: '' });
    alert('Password changed successfully.');
  };

  const signOutAll = async () => {
    if (!confirm('Sign out of all devices including this one?')) return;
    await supabase.auth.signOut({ scope: 'global' });
    router.replace('/login');
  };

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card space-y-2 p-6">
        <h1 className="text-2xl font-bold text-text-primary">Security</h1>
        <p className="text-sm text-text-secondary">Signed in as {email || user?.email}</p>
        <p className="text-xs text-text-muted">Last sign-in: {lastSignIn}</p>
        <p className="text-xs text-text-muted">This device: current session</p>
      </div>

      <form onSubmit={handlePassword} className="glass-card space-y-4 p-6">
        <h2 className="text-base font-semibold text-text-primary">Change Password</h2>
        <div>
          <label className="mb-1 block text-sm text-text-secondary">Current Password *</label>
          <input type="password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required autoComplete="current-password" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-secondary">New Password (min 8 chars) *</label>
          <input type="password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required autoComplete="new-password" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-text-secondary">Confirm New Password *</label>
          <input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required autoComplete="new-password" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
        </div>
        <button type="submit" disabled={saving} className="w-full rounded-[var(--radius-button)] bg-accent-primary px-4 py-3 font-medium text-accent-on-primary hover:bg-accent-primary-hover disabled:opacity-50">
          {saving ? 'Updating...' : 'Change Password'}
        </button>
      </form>

      <div className="glass-card space-y-3 p-6">
        <h2 className="text-base font-semibold text-text-primary">Sessions</h2>
        <button onClick={signOutAll} className="w-full rounded-[var(--radius-button)] border border-danger/40 px-4 py-3 font-medium text-danger hover:bg-danger/10">
          Sign Out of All Devices
        </button>
        <button onClick={signOut} className="w-full rounded-[var(--radius-button)] border border-border-subtle px-4 py-3 text-sm text-text-secondary hover:bg-surface-glass">
          Sign Out of This Device
        </button>
      </div>
    </div>
  );
}
