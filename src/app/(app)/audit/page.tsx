'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { AccessDenied } from '@/components/layout/access-denied';
import { Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Download, ChevronDown, ChevronRight } from 'lucide-react';

interface AuditRow {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
}

const ACTION_OPTIONS = ['created', 'updated', 'deleted', 'approved', 'paid', 'reversed', 'waived', 'logged_in'];
const ENTITY_OPTIONS = ['customer', 'loan', 'payment', 'penalty', 'collateral', 'product', 'user', 'setting', 'loan_products', 'onboarding_submission', 'customer_invitation'];

function mask(value: string): string {
  if (value.length <= 4) return '••••';
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

function maskSensitive(data: Record<string, unknown> | null, isOwner: boolean): Record<string, unknown> | null {
  if (!data || isOwner) return data;
  const out: Record<string, unknown> = { ...data };
  for (const k of ['nrc_number', 'nrc_or_passport', 'phone', 'alt_phone', 'next_of_kin_phone', 'customer_phone']) {
    if (typeof out[k] === 'string' && (out[k] as string).length > 0) {
      out[k] = mask(out[k] as string);
    }
  }
  return out;
}

function toCsv(rows: AuditRow[]): string {
  const header = ['when', 'who', 'action', 'entity', 'entity_id', 'before', 'after'];
  const lines = [header.join(',')];
  for (const r of rows) {
    const vals = [
      r.created_at,
      r.actor_email ?? r.actor_id ?? '',
      r.action,
      r.entity_type,
      r.entity_id ?? '',
      JSON.stringify(r.before_data ?? '').replace(/"/g, '""'),
      JSON.stringify(r.after_data ?? '').replace(/"/g, '""'),
    ];
    lines.push(vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }
  return lines.join('\n');
}

export default function AuditPage() {
  const { profile, loading: authLoading } = useAuth();
  const supabase = createClient();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<Array<{ id: string; full_name: string; email: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Filters
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [user, setUser] = useState('all');
  const [action, setAction] = useState('all');
  const [entity, setEntity] = useState('all');
  const [page, setPage] = useState(0);

  const isOwner = profile?.role === 'owner';
  const canAccess = profile?.role === 'owner' || profile?.role === 'branch_manager';

  useEffect(() => {
    if (!canAccess) return;
    setLoading(true);
    Promise.all([
      supabase.from('profiles').select('id, full_name, email').order('full_name').limit(100),
      supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', `${from}T00:00:00`)
        .lte('created_at', `${to}T23:59:59`)
        .order('created_at', { ascending: false })
        .range(page * 50, page * 50 + 49),
    ]).then(([profs, logs]) => {
      if (profs.data) setProfiles(profs.data as typeof profiles);
      if (logs.data) setRows(logs.data as AuditRow[]);
      setLoading(false);
    });
  }, [supabase, from, to, page, canAccess]);

  const filtered = useMemo(() => {
    return rows.filter(
      (r) =>
        (user === 'all' || r.actor_id === user) &&
        (action === 'all' || r.action.includes(action)) &&
        (entity === 'all' || r.entity_type === entity),
    );
  }, [rows, user, action, entity]);

  if (authLoading) {
    return <div className="py-12 text-center text-text-muted">Loading...</div>;
  }
  if (profile && !canAccess) {
    return <AccessDenied role={profile.role} />;
  }

  function exportCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Audit Log</h1>
          <p className="text-sm text-text-secondary">Append-only log of important changes</p>
        </div>
        <Button
          variant="secondary"
          onClick={exportCsv}
          className="gap-1"
        >
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <Surface className="flex flex-wrap gap-2 p-3">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto px-3 py-2" aria-label="From date" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto px-3 py-2" aria-label="To date" />
        <Select value={user} onChange={(e) => setUser(e.target.value)} className="w-auto px-3 py-2" aria-label="User filter">
          <option value="all">All users</option>
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>{p.full_name} ({p.email})</option>
          ))}
        </Select>
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="w-auto px-3 py-2" aria-label="Action filter">
          <option value="all">All actions</option>
          {ACTION_OPTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
        <Select value={entity} onChange={(e) => setEntity(e.target.value)} className="w-auto px-3 py-2" aria-label="Entity filter">
          <option value="all">All entities</option>
          {ENTITY_OPTIONS.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </Select>
      </Surface>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <Surface className="p-8 text-center text-text-muted">No audit entries for this filter.</Surface>
      ) : (
        <Surface variant="solid" className="overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                <th className="pb-2 font-medium">When</th>
                <th className="pb-2 font-medium">Who</th>
                <th className="pb-2 font-medium">Action</th>
                <th className="pb-2 font-medium">Entity</th>
                <th className="pb-2 font-medium">Entity ID</th>
                <th className="pb-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <>
                  <tr key={r.id} className="cursor-pointer border-b border-border-subtle/50 hover:bg-surface-glass/50" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <td className="py-2 text-text-secondary">{r.created_at.slice(0, 16).replace('T', ' ')}</td>
                    <td className="py-2 text-text-primary">{r.actor_email ?? r.actor_id?.slice(0, 8) ?? '—'} <span className="text-xs text-text-muted">({r.actor_role ?? '—'})</span></td>
                    <td className="py-2 text-text-secondary">{r.action}</td>
                    <td className="py-2 text-text-secondary">{r.entity_type}</td>
                    <td className="py-2 font-mono text-xs text-text-muted">{r.entity_id ? `${r.entity_id.slice(0, 8)}…` : '—'}</td>
                    <td className="py-2 text-text-muted">{expanded === r.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}</td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-exp`} className="bg-surface-glass/30">
                      <td colSpan={6} className="p-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs font-medium text-text-muted">Before</p>
                            <pre className="max-h-48 overflow-auto rounded-lg bg-surface-glass p-3 text-xs text-text-secondary">{JSON.stringify(maskSensitive(r.before_data, isOwner), null, 2) ?? '—'}</pre>
                          </div>
                          <div>
                            <p className="mb-1 text-xs font-medium text-text-muted">After</p>
                            <pre className="max-h-48 overflow-auto rounded-lg bg-surface-glass p-3 text-xs text-text-secondary">{JSON.stringify(maskSensitive(r.after_data, isOwner), null, 2) ?? '—'}</pre>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-text-muted">Page {page + 1}</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={filtered.length < 50}
            >
              Next
            </Button>
          </div>
        </Surface>
      )}
    </div>
  );
}
