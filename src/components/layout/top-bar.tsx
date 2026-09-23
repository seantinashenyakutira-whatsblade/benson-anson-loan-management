'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { UserAvatar } from '@/components/ui/user-avatar';
import { BrandMark } from '@/components/layout/brand-mark';
import { ThemeMenu } from '@/components/layout/theme-menu';
import { NotificationBell } from '@/components/layout/notification-bell';
import { LogOut, Menu, X, Search } from 'lucide-react';

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
          <BrandMark variant="full" height={32} />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="rounded-lg p-2 text-text-secondary hover:bg-surface-glass"
            title="Search (Ctrl+K)"
          >
            <Search size={20} />
          </button>
          <ThemeMenu />
          <NotificationBell />

          <div className="flex items-center gap-2">
            <div className="hidden text-right text-sm sm:block">
              <p className="font-medium text-text-primary">{profile?.full_name}</p>
              <p className="text-xs text-text-muted capitalize">
                {profile?.role?.replace('_', ' ')}
              </p>
            </div>
            <Link href="/profile" title="My profile">
              <UserAvatar user={{ full_name: profile?.full_name, avatar_url: profile?.avatar_url, role: profile?.role }} size="sm" showRoleBadge />
            </Link>
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
