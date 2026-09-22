'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Plus, MailPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { AccessDenied } from '@/components/layout/access-denied';
import { EmptyState } from '@/components/ui/empty-state';
import { shortToken, statusLabel } from '@/lib/invitations/share';
import { ShareBox } from './share-box';
import { createInvitation } from './actions';

export interface InvitationRow {
  id: string;
  token: string;
  branch_id: string;
  officer_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  expires_at: string;
  status: string;
  created_at: string;
}

const EXPIRY_OPTIONS = [
  { hours: 24, label: '24 hours' },
  { hours: 48, label: '48 hours' },
  { hours: 168, label: '7 days' },
];

const STATUS_FILTERS = ['all', 'pending', 'submitted', 'approved', 'rejected', 'expired'] as const;

export default function InvitationsPage() {
  const { profile, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<InvitationRow[]>([]);
  const [officers, setOfficers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>(searchParams.get('status') ?? 'all');
  const [officer, setOfficer] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showNew, setShowNew] = useState(false);
  const supabase = createClient();

  const role = profile?.role;
  const allowed = role === 'owner' || role === 'branch_manager' || role === 'loan_officer';

  useEffect(() => {
    Promise.all([
      supabase.from('customer_invitations').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('profiles').select('id, full_name').in('role', ['loan_officer', 'branch_manager', 'owner']),
    ]).then(([inv, profs]) => {
      if (inv.data) setRows(inv.data as InvitationRow[]);
      const map: Record<string, string> = {};
      for (const p of (profs.data ?? []) as Array<{ id: string; full_name: string }>) map[p.id] = p.full_name;
      setOfficers(map);
      setLoading(false);
    });
  }, [supabase]);

  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (status === 'all' || r.status === status) &&
          (officer === 'all' || r.officer_id === officer) &&
          (!from || r.created_at.slice(0, 10) >= from) &&
          (!to || r.created_at.slice(0, 10) <= to),
      ),
    [rows, status, officer, from, to],
  );

  if (authLoading || loading) {
    return <div className="py-12 text-center text-text-muted">Loading...</div>;
  }

  if (profile && !allowed) {
    return <AccessDenied role={role} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Invitations</h1>
          <p className="text-sm text-text-secondary">Customer self-onboarding links</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2.5 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
        >
          <Plus size={16} /> New Invitation
        </button>
      </div>

      <div className="glass-card flex flex-wrap gap-2 p-3">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2 text-sm text-text-primary" aria-label="Filter by status">
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s} className="capitalize">{s === 'all' ? 'All statuses' : statusLabel(s)}</option>
          ))}
        </select>
        <select value={officer} onChange={(e) => setOfficer(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2 text-sm text-text-primary" aria-label="Filter by officer">
          <option value="all">All officers</option>
          {Object.entries(officers).map(([id, name]) => (
            <option key={id} value={id}>{name}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2 text-sm text-text-primary" aria-label="From date" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2 text-sm text-text-primary" aria-label="To date" />
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={MailPlus} headline="No invitations" message="Create an invitation to onboard a customer remotely." />
      ) : (
        <div className="glass-card overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                <th className="pb-2 font-medium">Token</th>
                <th className="pb-2 font-medium">Customer</th>
                <th className="pb-2 font-medium">Officer</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Expires</th>
                <th className="pb-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-border-subtle/50">
                  <td className="py-2">
                    <Link href={`/invitations/${r.id}`} className="font-mono text-xs text-accent-primary hover:underline">
                      {shortToken(r.token)}
                    </Link>
                  </td>
                  <td className="py-2 text-text-primary">{r.customer_name || '—'}</td>
                  <td className="py-2 text-text-secondary">{officers[r.officer_id] || '—'}</td>
                  <td className="py-2">
                    <span className="rounded-full bg-surface-glass px-2 py-0.5 text-xs text-text-secondary">{statusLabel(r.status)}</span>
                  </td>
                  <td className="py-2 text-text-secondary">{r.expires_at.slice(0, 16).replace('T', ' ')}</td>
                  <td className="py-2 text-text-secondary">{r.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewInvitationModal
          onClose={() => setShowNew(false)}
          onCreated={(row) => {
            const full: InvitationRow = {
              id: row.id,
              token: row.token,
              branch_id: '',
              officer_id: profile?.id ?? '',
              customer_name: row.customer_name,
              customer_phone: row.customer_phone,
              expires_at: row.expires_at,
              status: 'pending',
              created_at: new Date().toISOString(),
            };
            setRows((list) => [full, ...list]);
            setShowNew(false);
          }}
        />
      )}
    </div>
  );
}

function NewInvitationModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (row: { id: string; token: string; url: string; expires_at: string; customer_name: string; customer_phone: string }) => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState(24);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ id: string; token: string; url: string; expires_at: string } | null>(null);

  async function submit() {
    setError(null);
    setSaving(true);
    const res = await createInvitation({ customerName: name, customerPhone: phone, expiryHours: hours });
    setSaving(false);
    if (!res.ok || !res.invitation) {
      setError(res.error ?? 'Failed to create invitation.');
      return;
    }
    setCreated(res.invitation);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card max-h-[85vh] w-full max-w-md overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        {!created ? (
          <>
            <h2 className="text-lg font-bold text-text-primary">New Invitation</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Customer name (optional)</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:outline-none" placeholder="e.g. Mutinta Phiri" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Customer phone (optional)</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:outline-none" placeholder="+2609XXXXXXXX" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-text-secondary">Link expires in</label>
                <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary">
                  {EXPIRY_OPTIONS.map((o) => (
                    <option key={o.hours} value={o.hours}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <div className="mt-5 flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-[var(--radius-button)] border border-border-subtle px-4 py-2.5 text-sm text-text-secondary">Cancel</button>
              <button onClick={submit} disabled={saving} className="flex-1 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2.5 text-sm font-medium text-accent-on-primary disabled:opacity-50">
                {saving ? 'Creating…' : 'Create Link'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-text-primary">Share Invitation</h2>
            <div className="mt-3">
              <ShareBox token={created.token} path={created.url} customerName={name} />
            </div>
            <button
              onClick={() => onCreated({ ...created, customer_name: name, customer_phone: phone })}
              className="mt-4 w-full py-2 text-center text-sm text-text-muted hover:text-text-primary"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
