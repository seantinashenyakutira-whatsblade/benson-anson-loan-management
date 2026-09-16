'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import {
  LayoutDashboard,
  Users,
  HandCoins,
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
  { href: '/payments', label: 'Payments', icon: Receipt },
  { href: '/collections', label: 'Collections', icon: AlertTriangle },
  { href: '/penalties', label: 'Penalties', icon: AlertTriangle },
  { href: '/accounting', label: 'Accounting', icon: BookOpen, roles: ['owner', 'branch_manager'] },
  { href: '/reports', label: 'Reports', icon: CircleDollarSign },
  { href: '/settings', label: 'Settings', icon: Settings, roles: ['owner'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(profile?.role ?? ''),
  );

  return (
    <aside className="hidden w-64 flex-col border-r border-border-subtle bg-bg-base lg:flex">
      <div className="flex h-14 items-center border-b border-border-subtle px-4">
        <h1 className="text-lg font-bold text-accent-primary">BAL</h1>
        <span className="ml-2 text-xs text-text-muted">Benson Anson Loans</span>
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
