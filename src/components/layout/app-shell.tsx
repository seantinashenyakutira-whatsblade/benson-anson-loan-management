'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/auth-provider';
import { TopBar } from '@/components/layout/top-bar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { AccessDenied } from '@/components/layout/access-denied';
import { CommandPalette } from '@/components/layout/command-palette';
import { canAccessRoute } from '@/lib/permissions';

function Shell({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;
  if (!canAccessRoute(profile?.role, pathname)) {
    return <AccessDenied role={profile?.role} />;
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 pb-20 lg:p-6 lg:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
      <CommandPalette />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Shell>{children}</Shell>
    </AuthProvider>
  );
}
