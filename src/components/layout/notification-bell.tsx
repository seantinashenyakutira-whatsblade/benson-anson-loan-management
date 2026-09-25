'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { Surface } from '@/components/ui/surface';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  kind: string;
  read_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const supabase = createClient();

  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    async function load() {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, link, kind, read_at, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (mounted && data) setItems(data as Notification[]);
    }
    load();

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const row = payload.new as Notification;
          setItems((prev) => [row, ...prev].slice(0, 10));
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase, user]);

  async function markRead(id: string, link: string | null) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    setOpen(false);
    if (link) router.push(link);
  }

  async function markAllRead() {
    if (!user) return;
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-text-secondary hover:bg-surface-glass"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <Surface variant="overlay" className="absolute right-0 top-10 z-50 w-80">
            <div className="flex items-center justify-between border-b border-border-subtle p-3">
              <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-accent-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <p className="p-6 text-center text-sm text-text-muted">No notifications.</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markRead(n.id, n.link)}
                    className={`flex w-full items-start gap-3 p-3 text-left hover:bg-surface-glass ${!n.read_at ? 'bg-accent-primary/5' : ''}`}
                  >
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${!n.read_at ? 'bg-accent-primary' : 'bg-transparent'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-primary">{n.title}</span>
                      {n.body && <span className="block truncate text-xs text-text-secondary">{n.body}</span>}
                      <span className="block text-[11px] text-text-muted">{new Date(n.created_at).toLocaleDateString('en-ZM')}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="border-t border-border-subtle p-2 text-center">
              <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs text-accent-primary hover:underline">
                View all
              </Link>
            </div>
          </Surface>
        </>
      )}
    </div>
  );
}
