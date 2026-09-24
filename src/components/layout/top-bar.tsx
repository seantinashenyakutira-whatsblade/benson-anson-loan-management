'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { UserAvatar } from '@/components/ui/user-avatar';
import { BrandMark } from '@/components/layout/brand-mark';
import { ThemeMenu } from '@/components/layout/theme-menu';
import { NotificationBell } from '@/components/layout/notification-bell';
import { Surface } from '@/components/ui/surface';
import { visibleNav } from '@/lib/permissions';
import {
  LogOut,
  Menu,
  X,
  Search,
  LayoutDashboard,
  Users,
  HandCoins,
  Receipt,
  CircleDollarSign,
  Settings,
} from 'lucide-react';

const MOBILE_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { href: '/customers', label: 'Customers', icon: Users, key: 'customers' },
  { href: '/loans', label: 'Loans', icon: HandCoins, key: 'loans' },
  { href: '/payments', label: 'Payments', icon: Receipt, key: 'payments' },
  { href: '/reports', label: 'Reports', icon: CircleDollarSign, key: 'reports' },
  { href: '/settings', label: 'Settings', icon: Settings, key: 'settings', roles: ['owner', 'branch_manager'] },
];

export function TopBar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const allowed = visibleNav(profile?.role);
  const showAll = allowed.includes('all');
  const mobileItems = MOBILE_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(profile?.role ?? '')) return false;
    return showAll || allowed.includes(item.key);
  });

  return (
    <>
      <Surface as="header" variant="bar" borderSide="bottom" className="sticky top-0 z-40">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass lg:hidden"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <BrandMark variant="full" height={32} />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass"
              title="Search (Ctrl+K)"
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            <ThemeMenu />
            <NotificationBell />

            <div className="hidden items-center gap-2 sm:flex">
              <div className="hidden text-right text-sm md:block">
                <p className="font-medium text-text-primary">{profile?.full_name}</p>
                <p className="text-xs text-text-muted capitalize">
                  {profile?.role?.replace('_', ' ')}
                </p>
              </div>
              <Link href="/profile" title="My profile" aria-label="My profile">
                <UserAvatar user={{ full_name: profile?.full_name, avatar_url: profile?.avatar_url, role: profile?.role }} size="sm" showRoleBadge />
              </Link>
            </div>
            <Link
              href="/profile"
              title="My profile"
              aria-label="My profile"
              className="flex min-h-11 min-w-11 items-center justify-center sm:hidden"
            >
              <UserAvatar user={{ full_name: profile?.full_name, avatar_url: profile?.avatar_url, role: profile?.role }} size="sm" showRoleBadge />
            </Link>

            <button
              onClick={signOut}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </Surface>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 animate-[fadeIn_150ms_var(--ease-out)]" onClick={() => setMenuOpen(false)} aria-hidden />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border-subtle bg-bg-base animate-[slideIn_220ms_var(--ease-out)]">
            <div className="flex h-14 items-center justify-between border-b border-border-subtle px-4">
              <BrandMark variant="full" height={28} />
              <button
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-glass"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <div className="space-y-1">
                {mobileItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-accent-primary/10 text-accent-primary'
                          : 'text-text-secondary hover:bg-surface-glass hover:text-text-primary',
                      )}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </nav>
            <div className="border-t border-border-subtle p-4">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-text-secondary hover:bg-surface-glass"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
    </>
  );
}
