'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { ArrowLeft } from 'lucide-react';

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [prefs, setPrefs] = useState({ email_opt_in: true, push_opt_in: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('email_opt_in, push_opt_in')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data) setPrefs({ email_opt_in: data.email_opt_in, push_opt_in: data.push_opt_in });
        setLoading(false);
      });
  }, [supabase, user]);

  const toggle = async (key: 'email_opt_in' | 'push_opt_in') => {
    if (!user) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ [key]: next[key] }).eq('id', user.id);
    setSaving(false);
    if (error) {
      alert('Error: ' + error.message);
      setPrefs(prefs);
    }
  };

  if (loading) return <div className="py-12 text-center text-text-muted">Loading...</div>;

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card space-y-2 p-6">
        <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
        <p className="text-sm text-text-secondary">Preferences are stored now; dispatch arrives in a later stage.</p>

        {(
          [
            { key: 'email_opt_in' as const, label: 'Email notifications', desc: 'Payment receipts, approvals and reminders' },
            { key: 'push_opt_in' as const, label: 'Push notifications', desc: 'Device alerts for assigned work' },
          ]
        ).map((row) => (
          <button
            key={row.key}
            onClick={() => toggle(row.key)}
            disabled={saving}
            className="flex w-full items-center justify-between rounded-xl border border-border-subtle p-4 text-left hover:bg-surface-glass"
          >
            <span>
              <span className="block text-sm font-medium text-text-primary">{row.label}</span>
              <span className="block text-xs text-text-muted">{row.desc}</span>
            </span>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${prefs[row.key] ? 'bg-accent-primary' : 'bg-surface-glass-2'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${prefs[row.key] ? 'left-[22px]' : 'left-0.5'}`} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
