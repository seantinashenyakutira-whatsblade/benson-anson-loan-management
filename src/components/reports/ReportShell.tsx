'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { EmptyState } from '@/components/ui/empty-state';
import { FileSpreadsheet, FileText, Printer, BarChart3 } from 'lucide-react';
import type { ReportColumn, ReportResult } from '@/lib/reports/types';
import { toLocalIso } from '@/lib/reports/types';

interface ReportShellProps {
  slug: string;
  title: string;
  subtitle: string;
  statusOptions?: string[];
}

const PRESETS = [
  { label: 'This Month', get: () => monthRange(0) },
  { label: 'Last Month', get: () => monthRange(-1) },
  { label: 'Today', get: () => { const t = iso(new Date()); return { from: t, to: t }; } },
  { label: 'This Year', get: () => ({ from: `${new Date().getFullYear()}-01-01`, to: iso(new Date()) }) },
];

function iso(d: Date): string {
  return toLocalIso(d);
}

function monthRange(delta: number): { from: string; to: string } {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + delta, 1);
  const last = new Date(now.getFullYear(), now.getMonth() + delta + 1, 0);
  return { from: iso(first), to: iso(last) };
}

export function formatCell(col: ReportColumn, value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  if (col.kind === 'money') return formatKwacha(Number(value));
  return String(value);
}

export default function ReportShell({ slug, title, subtitle, statusOptions }: ReportShellProps) {
  const first = monthRange(0);
  const [from, setFrom] = useState(first.from);
  const [to, setTo] = useState(first.to);
  const [branch, setBranch] = useState('all');
  const [officer, setOfficer] = useState('all');
  const [status, setStatus] = useState('all');
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [officers, setOfficers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [role, setRole] = useState('');
  const [data, setData] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('branches').select('id, name').order('name').then(({ data: b }) => {
      if (b) setBranches(b);
    });
    supabase.from('profiles').select('id, full_name').eq('role', 'loan_officer').then(({ data: o }) => {
      if (o) setOfficers(o);
    });
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        if (p) setRole(p.role);
      }
    });
  }, [supabase]);

  const query = useCallback(() => {
    const q = new URLSearchParams({ from, to, branch, officer, status });
    return `/api/reports/${slug}?${q.toString()}`;
  }, [slug, from, to, branch, officer, status]);

  useEffect(() => {
    setLoading(true);
    fetch(query())
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setData(null);
        else setData(j as ReportResult);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [query]);

  const exportBase = () => {
    const q = new URLSearchParams({ from, to, branch, officer, status });
    return q.toString();
  };
  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          <p className="text-sm text-text-secondary">{subtitle}</p>
        </div>
        <div className="no-print flex gap-2">
          <Link href={`/api/reports/${slug}/export/excel?${exportBase()}`} className="flex items-center gap-1 rounded-[var(--radius-button)] border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-surface-glass">
            <FileSpreadsheet size={14} />
            Excel
          </Link>
          <Link href={`/api/reports/${slug}/export/pdf?${exportBase()}`} className="flex items-center gap-1 rounded-[var(--radius-button)] border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-surface-glass">
            <FileText size={14} />
            PDF
          </Link>
          <button onClick={() => window.print()} className="flex items-center gap-1 rounded-[var(--radius-button)] border border-border-subtle px-3 py-2 text-xs text-text-secondary hover:bg-surface-glass">
            <Printer size={14} />
            Print
          </button>
        </div>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => { const r = p.get(); setFrom(r.from); setTo(r.to); }}
            className="rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-glass"
          >
            {p.label}
          </button>
        ))}
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-1.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-1.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none" />
        {role === 'owner' && (
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-1.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none">
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        {(role === 'owner' || role === 'branch_manager') && (
          <select value={officer} onChange={(e) => setOfficer(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-1.5 text-xs text-text-primary focus:border-accent-primary focus:outline-none">
            <option value="all">All Officers</option>
            {officers.map((o) => (
              <option key={o.id} value={o.id}>{o.full_name}</option>
            ))}
          </select>
        )}
        {statusOptions && (
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-1.5 text-xs text-text-primary capitalize focus:border-accent-primary focus:outline-none">
            <option value="all">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading report...</div>
      ) : !data || data.rows.length === 0 ? (
        <EmptyState icon={BarChart3} headline="No data for these filters" message="Adjust the date range or filters — figures appear once matching records exist." />
      ) : (
        <div className="glass-card overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                {data.columns.map((c) => (
                  <th key={c.key} className={`pb-2 pr-4 font-medium ${c.kind === 'money' || c.kind === 'number' ? 'text-right tabular-nums' : ''}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i} className="border-b border-border-subtle/50">
                  {data.columns.map((c) => (
                    <td key={c.key} className={`py-2 pr-4 ${c.kind === 'money' || c.kind === 'number' ? 'text-right tabular-nums' : 'text-text-primary'} ${c.kind === 'text' || c.kind === 'date' ? 'text-text-secondary' : ''}`}>
                      {formatCell(c, r[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totals && (
              <tfoot>
                <tr className="font-semibold text-text-primary">
                  {data.columns.map((c) => (
                    <td key={c.key} className={`py-2 pr-4 ${c.kind === 'money' || c.kind === 'number' ? 'text-right tabular-nums' : ''}`}>
                      {formatCell(c, totals[c.key])}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
