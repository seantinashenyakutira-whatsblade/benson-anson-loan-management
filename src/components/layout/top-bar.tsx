'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { LogOut, Menu, X, Bell, Search } from 'lucide-react';

export function TopBar() {
  const { profile, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle bg-bg-base/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-glass lg:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <img
            src="/branding/logo.png"
            alt="Anson Benson Cash Solutions"
            style={{ height: 32, width: 'auto' }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-glass"
            title="Search (Ctrl+K)"
          >
            <Search size={20} />
          </button>
          <button className="relative rounded-lg p-2 text-text-secondary hover:bg-surface-glass">
            <Bell size={20} />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" />
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium text-text-primary">{profile?.full_name}</p>
              <p className="text-xs text-text-muted capitalize">
                {profile?.role?.replace('_', ' ')}
              </p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-accent-on-primary">
              {profile?.full_name?.charAt(0) ?? 'U'}
            </div>
          </div>

          <button
            onClick={signOut}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-glass"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
