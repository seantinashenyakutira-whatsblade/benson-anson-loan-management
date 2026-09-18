'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/hooks/use-permissions';
import { Building, Shield, Bell, Database } from 'lucide-react';

interface Setting {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'lending' | 'notifications' | 'system'>('general');
  const { role } = usePermissions();
  const canEdit = role === 'owner';
  const supabase = createClient();

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .order('category');

      if (data) setSettings(data);
      setLoading(false);
    };

    fetchSettings();
  }, [supabase]);

  const tabs = [
    { id: 'general' as const, label: 'General', icon: Building },
    { id: 'lending' as const, label: 'Lending', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'system' as const, label: 'System', icon: Database },
  ];

  const filteredSettings = settings.filter((s) => {
    switch (activeTab) {
      case 'general': return ['general', 'company'].includes(s.category);
      case 'lending': return ['lending', 'penalty'].includes(s.category);
      case 'notifications': return s.category === 'notification';
      case 'system': return s.category === 'system';
      default: return true;
    }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>

      {role === 'owner' && (
        <Link
          href="/settings/permissions"
          className="glass-card glass-card-hover block p-4 transition-all"
        >
          <p className="text-sm font-medium text-text-primary">Permission Matrix →</p>
          <p className="text-xs text-text-muted">Configure what each role can see and do.</p>
        </Link>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-[var(--radius-button)] bg-surface-glass p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-button)] px-3 py-2 text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-surface-glass-2 text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filteredSettings.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No settings found for this category.</div>
      ) : (
        <div className="glass-card divide-y divide-border-subtle">
          {filteredSettings.map((setting) => (
            <div key={setting.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{setting.key.replace(/_/g, ' ')}</p>
                  {setting.description && (
                    <p className="text-xs text-text-muted">{setting.description}</p>
                  )}
                </div>
                <div className="ml-4 max-w-[200px]">
                  <input
                    type="text"
                    defaultValue={setting.value}
                    disabled={!canEdit}
                    title={canEdit ? undefined : 'Only owners can edit settings'}
                    className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-1.5 text-right text-sm text-text-primary focus:border-accent-primary focus:outline-none disabled:opacity-60"
                    onBlur={async (e) => {
                      if (!canEdit) return;
                      await supabase
                        .from('settings')
                        .update({ value: e.target.value })
                        .eq('id', setting.id);
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
