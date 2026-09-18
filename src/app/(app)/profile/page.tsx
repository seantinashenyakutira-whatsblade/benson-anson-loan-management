'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ChevronRight, Pencil, ShieldCheck, Bell, Palette } from 'lucide-react';

export default function ProfilePage() {
  const { profile } = useAuth();

  const links = [
    { href: '/profile/edit', label: 'Edit Profile', desc: 'Name, phone, photo and bio', icon: Pencil },
    { href: '/profile/security', label: 'Security', desc: 'Password and sessions', icon: ShieldCheck },
    { href: '/profile/notifications', label: 'Notifications', desc: 'Email and push preferences', icon: Bell },
    { href: '/profile/appearance', label: 'Appearance', desc: 'Light, dark or system theme', icon: Palette },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">Profile</h1>

      <div className="glass-card flex items-center gap-4 p-6">
        <UserAvatar user={{ full_name: profile?.full_name, avatar_url: profile?.avatar_url, role: profile?.role }} size="lg" showRoleBadge />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-text-primary">{profile?.full_name || '—'}</p>
          <p className="truncate text-sm text-text-secondary">{profile?.email || ''}</p>
          <span className="mt-1 inline-block rounded-full bg-accent-primary/10 px-2.5 py-0.5 text-xs font-medium capitalize text-accent-primary">
            {profile?.role?.replace('_', ' ') || '—'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="glass-card glass-card-hover flex items-center gap-4 p-4 transition-all">
            <l.icon size={20} className="text-accent-primary" />
            <span className="flex-1">
              <span className="block text-sm font-medium text-text-primary">{l.label}</span>
              <span className="block text-xs text-text-muted">{l.desc}</span>
            </span>
            <ChevronRight size={18} className="text-text-muted" />
          </Link>
        ))}
      </div>
    </div>
  );
}
