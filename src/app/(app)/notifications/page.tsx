'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  kind: string;
  read_at: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let query = supabase
      .from('notifications')
      .select('id, title, body, link, kind, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(page * 20, page * 20 + 19);
    if (filter === 'unread') query = query.is('read_at', null);
    setLoading(true);
    query.then(({ data }) => {
      if (data) setItems(data as Notification[]);
      setLoading(false);
    });

    const channel = supabase
      .channel(`notifications-page:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        const row = payload.new as Notification;
        setItems((prev) => [row, ...prev].slice(0, 20));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, user, filter, page]);

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  }

  async function markAllRead() {
    if (!user) return;
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="text-sm text-text-secondary">All your notifications</p>
        </div>
        <button onClick={markAllRead} className="rounded-[var(--radius-button)] border border-border-subtle px-3 py-2 text-sm text-text-secondary hover:bg-surface-glass">
          Mark all read
        </button>
      </div>

      <div className="flex gap-2">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(0); }}
            className={`rounded-[var(--radius-button)] px-3 py-2 text-sm capitalize ${filter === f ? 'bg-accent-primary text-accent-on-primary' : 'border border-border-subtle text-text-secondary'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : items.length === 0 ? (
        <div className="glass-card p-8 text-center text-text-muted">No notifications.</div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className={`glass-card flex items-start gap-3 p-4 ${!n.read_at ? 'border-l-4 border-l-accent-primary' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{n.title}</p>
                {n.body && <p className="mt-1 text-sm text-text-secondary">{n.body}</p>}
                <p className="mt-1 text-xs text-text-muted">{new Date(n.created_at).toLocaleString('en-ZM')}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {!n.read_at && (
                  <button onClick={() => markRead(n.id)} className="rounded-[var(--radius-button)] bg-accent-primary px-3 py-1.5 text-xs font-medium text-accent-on-primary">
                    Mark read
                  </button>
                )}
                {n.link && (
                  <Link href={n.link} className="rounded-[var(--radius-button)] border border-border-subtle px-3 py-1.5 text-xs text-text-secondary">
                    View
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded-[var(--radius-button)] border border-border-subtle px-3 py-2 text-sm disabled:opacity-50">
          Previous
        </button>
        <span className="text-sm text-text-muted">Page {page + 1}</span>
        <button onClick={() => setPage((p) => p + 1)} disabled={items.length < 20} className="rounded-[var(--radius-button)] border border-border-subtle px-3 py-2 text-sm disabled:opacity-50">
          Next
        </button>
      </div>
    </div>
  );
}
