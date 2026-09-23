'use client';

import { useEffect, useState } from 'react';
import { MessageCircle, X, Send, Paperclip, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { CATEGORIES, routedRole } from '@/lib/chat/routing';
import { RoleBadge } from './role-badge';

interface Thread {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_by: string;
  created_at: string;
}

interface Message {
  id: string;
  thread_id: string;
  body: string;
  sender_id: string;
  created_at: string;
  attachments: unknown[];
}

export function ChatFab() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<string>(CATEGORIES[0]!);
  const [newBody, setNewBody] = useState('');
  const [input, setInput] = useState('');
  const [showNew, setShowNew] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!user || !open) return;
    supabase
      .from('chat_threads')
      .select('id, subject, category, status, created_by, created_at')
      .order('updated_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setThreads(data as Thread[]);
      });

    const ch = supabase
      .channel('chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const msg = payload.new as Message;
        if (msg.thread_id === active) setMessages((prev) => [...prev, msg]);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [supabase, user, open, active]);

  useEffect(() => {
    if (!active) return;
    supabase
      .from('chat_messages')
      .select('id, body, sender_id, created_at, attachments')
      .eq('thread_id', active)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });
  }, [supabase, active]);

  async function createThread() {
    if (!user || !newSubject.trim() || !newBody.trim()) return;
    const { data, error } = await supabase
      .from('chat_threads')
      .insert({
        created_by: user.id,
        category: newCategory,
        subject: newSubject.trim(),
        routed_to_role: routedRole(newCategory),
      })
      .select('id')
      .single();
    if (error || !data) return;
    const threadId = (data as { id: string }).id;
    await supabase.from('chat_messages').insert({
      thread_id: threadId,
      sender_id: user.id,
      body: newBody.trim(),
    });
    // Notify other participants via notifications (best-effort, handled by server trigger in production)
    setThreads((prev) => [{ id: threadId, subject: newSubject.trim(), category: newCategory!, status: 'open', created_by: user.id, created_at: new Date().toISOString() }, ...prev]);
    setActive(threadId);
    setShowNew(false);
    setNewSubject('');
    setNewBody('');
  }

  async function send() {
    if (!user || !active || !input.trim()) return;
    const body = input.trim();
    setInput('');
    const { error } = await supabase.from('chat_messages').insert({
      thread_id: active,
      sender_id: user.id,
      body,
    });
    if (error) setInput(body);
  }

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary text-accent-on-primary shadow-lg hover:bg-accent-primary-hover"
        aria-label="Chat"
      >
        {open ? <X size={24} /> : <MessageCircle size={24} />}
      </button>

      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[70vh] w-[360px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg-base shadow-2xl max-sm:inset-x-2 max-sm:w-auto">
          <div className="flex items-center justify-between border-b border-border-subtle p-3">
            <h3 className="text-sm font-semibold text-text-primary">Messages</h3>
            <button onClick={() => setShowNew((v) => !v)} className="flex items-center gap-1 rounded-lg bg-accent-primary px-2 py-1 text-xs font-medium text-accent-on-primary">
              <Plus size={14} /> New
            </button>
          </div>

          {showNew ? (
            <div className="space-y-2 p-3">
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full rounded-lg border border-border-subtle bg-surface-glass px-3 py-2 text-sm">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Subject" className="w-full rounded-lg border border-border-subtle bg-surface-glass px-3 py-2 text-sm" />
              <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Message" rows={3} className="w-full rounded-lg border border-border-subtle bg-surface-glass px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button onClick={() => setShowNew(false)} className="flex-1 rounded-lg border border-border-subtle px-3 py-2 text-sm">Cancel</button>
                <button onClick={createThread} className="flex-1 rounded-lg bg-accent-primary px-3 py-2 text-sm font-medium text-accent-on-primary">Create</button>
              </div>
            </div>
          ) : !active ? (
            <div className="flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <p className="p-6 text-center text-sm text-text-muted">No conversations yet.</p>
              ) : (
                threads.map((t) => (
                  <button key={t.id} onClick={() => setActive(t.id)} className="flex w-full items-center gap-3 border-b border-border-subtle/50 p-3 text-left hover:bg-surface-glass">
                    <RoleBadge role={profile?.role ?? 'loan_officer'} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-primary">{t.subject}</span>
                      <span className="block truncate text-xs text-text-muted">{t.category} · {t.status}</span>
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 border-b border-border-subtle p-2">
                <button onClick={() => setActive(null)} className="rounded-lg px-2 py-1 text-xs text-text-secondary">← Back</button>
                <span className="truncate text-sm font-medium text-text-primary">{threads.find((t) => t.id === active)?.subject}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {messages.map((m) => (
                  <div key={m.id} className={`flex gap-2 ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === user.id ? 'bg-accent-primary text-accent-on-primary' : 'bg-surface-glass text-text-primary'}`}>
                      <p>{m.body}</p>
                      <p className="mt-1 text-[10px] opacity-60">{new Date(m.created_at).toLocaleTimeString('en-ZM')}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-border-subtle p-2">
                <label className="cursor-pointer rounded-lg p-2 text-text-secondary hover:bg-surface-glass">
                  <Paperclip size={18} />
                  <input type="file" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !active) return;
                    if (file.size > 25 * 1024 * 1024) return;
                    const path = `${user.id}/${Date.now()}-${file.name}`;
                    const { error } = await supabase.storage.from('chat-attachments').upload(path, file);
                    if (!error) {
                      await supabase.from('chat_messages').insert({
                        thread_id: active,
                        sender_id: user.id,
                        body: `📎 ${file.name}`,
                        attachments: [{ path, name: file.name, size: file.size }],
                      });
                    }
                    e.target.value = '';
                  }} />
                </label>
                <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} placeholder="Type a message" className="flex-1 rounded-full border border-border-subtle bg-surface-glass px-4 py-2 text-sm focus:outline-none" />
                <button onClick={send} className="rounded-full bg-accent-primary p-2 text-accent-on-primary">
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
