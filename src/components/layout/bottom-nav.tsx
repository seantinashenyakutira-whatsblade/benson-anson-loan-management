'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/auth-provider';
import { visibleNav } from '@/lib/permissions';
import { Surface } from '@/components/ui/surface';
import {
  LayoutDashboard,
  Users,
  HandCoins,
  Receipt,
  CircleDollarSign,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { href: '/customers', label: 'Customers', icon: Users, key: 'customers' },
  { href: '/loans', label: 'Loans', icon: HandCoins, key: 'loans' },
  { href: '/payments', label: 'Payments', icon: Receipt, key: 'payments' },
  { href: '/reports', label: 'Reports', icon: CircleDollarSign, key: 'reports' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const allowed = visibleNav(profile?.role);
  const showAll = allowed.includes('all');
  const items = NAV_ITEMS.filter((i) => showAll || allowed.includes(i.key));

  return (
    <Surface as="nav" variant="bar" borderSide="top" className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      <div className="flex items-center justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors',
                isActive
                  ? 'text-accent-primary'
                  : 'text-text-muted hover:text-text-secondary',
              )}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </Surface>
  );
}
