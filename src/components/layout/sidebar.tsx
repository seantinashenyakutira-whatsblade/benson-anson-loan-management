'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { visibleNav } from '@/lib/permissions';
import {
  LayoutDashboard,
  Users,
  HandCoins,
  FileText,
  Receipt,
  CircleDollarSign,
  Shield,
  Settings,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/collateral', label: 'Collateral', icon: Shield },
  { href: '/loans', label: 'Loans', icon: HandCoins },
  { href: '/applications', label: 'Applications', icon: FileText },
  { href: '/payments', label: 'Payments', icon: Receipt },
  { href: '/collections', label: 'Collections', icon: AlertTriangle },
  { href: '/penalties', label: 'Penalties', icon: AlertTriangle },
  { href: '/accounting', label: 'Accounting', icon: BookOpen },
  { href: '/reports', label: 'Reports', icon: CircleDollarSign },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['owner', 'branch_manager'] },
];

const KEY_OF: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/customers': 'customers',
  '/collateral': 'collateral',
  '/loans': 'loans',
  '/applications': 'applications',
  '/payments': 'payments',
  '/collections': 'collections',
  '/penalties': 'penalties',
  '/accounting': 'accounting',
  '/reports': 'reports',
  '/settings': 'settings',
};

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const allowed = visibleNav(profile?.role);
  const showAll = allowed.includes('all');
  const filteredItems = NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(profile?.role ?? '')) return false;
    const key = KEY_OF[item.href] || item.href;
    return showAll || allowed.includes(key);
  });

  return (
    <aside className="hidden w-64 flex-col border-r border-border-subtle bg-bg-base lg:flex">
      <div className="flex h-14 items-center border-b border-border-subtle px-4">
        <img
          src="/branding/logo.png"
          alt="Anson Benson Cash Solutions"
          style={{ height: 32, width: 'auto' }}
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-1">
          {filteredItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
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
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-xs font-bold text-accent-on-primary">
            {profile?.full_name?.charAt(0) ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-text-primary">
              {profile?.full_name}
            </p>
            <p className="truncate text-xs text-text-muted capitalize">
              {profile?.role?.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
