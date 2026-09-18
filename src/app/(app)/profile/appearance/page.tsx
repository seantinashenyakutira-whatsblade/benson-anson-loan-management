'use client';

import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ArrowLeft, Sun, Moon, Monitor, Check } from 'lucide-react';

export default function AppearancePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light', desc: 'Bright theme for daylight use', icon: Sun },
    { value: 'dark', label: 'Dark', desc: 'Navy theme, easy on the eyes at night', icon: Moon },
    { value: 'system', label: 'System', desc: 'Follow your device setting automatically', icon: Monitor },
  ];

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card space-y-2 p-6">
        <h1 className="text-2xl font-bold text-text-primary">Appearance</h1>
        <p className="text-sm text-text-secondary">Your choice is saved on this device automatically.</p>

        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => setTheme(o.value)}
            className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-all ${
              theme === o.value ? 'border-accent-primary bg-accent-primary/5' : 'border-border-subtle hover:bg-surface-glass'
            }`}
          >
            <o.icon size={22} className="shrink-0 text-accent-primary" />
            <span className="flex-1">
              <span className="block text-sm font-medium text-text-primary">{o.label}</span>
              <span className="block text-xs text-text-muted">{o.desc}</span>
            </span>
            {theme === o.value && <Check size={18} className="text-accent-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}
