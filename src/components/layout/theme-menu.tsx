'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

/** Theme dropdown for the TopBar (Light / Dark / System). */
export function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];
  const Current = (options.find((o) => o.value === theme) || options[2]!).icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 text-text-secondary hover:bg-surface-glass"
        title="Theme"
      >
        <Current size={20} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="glass-card absolute right-0 z-50 mt-1 w-36 p-1.5">
            <p className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">Theme</p>
            {options.map((o) => (
              <button
                key={o.value}
                onClick={() => {
                  setTheme(o.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-text-primary hover:bg-surface-glass"
              >
                <o.icon size={15} className="text-text-secondary" />
                {o.label}
                {theme === o.value && <span className="ml-auto text-accent-primary">●</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
