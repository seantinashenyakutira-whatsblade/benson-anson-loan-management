'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { EmptyState } from '@/components/ui/empty-state';
import { Search, BookOpen } from 'lucide-react';

interface JournalLine {
  id: string;
  debit: number;
  credit: number;
  description: string | null;
  chart_of_accounts?: { code: string; name: string } | Array<{ code: string; name: string }> | null;
}

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference_type: string | null;
  total_debit: number;
  total_credit: number;
  status: string;
  journal_lines?: JournalLine[];
}

function accountOf(line: JournalLine): { code: string; name: string } {
  const c = line.chart_of_accounts;
  if (Array.isArray(c)) return c[0] ?? { code: '?', name: 'Unknown' };
  return c ?? { code: '?', name: 'Unknown' };
}

const REF_TYPES = ['all', 'payment', 'disbursement', 'expense', 'income', 'penalty', 'adjustment', 'manual'];

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [search, setSearch] = useState('');
  const [refFilter, setRefFilter] = useState('all');
  const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]!);
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]!);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      let query = supabase
        .from('journal_entries')
        .select('*, journal_lines(*, chart_of_accounts(code, name))')
        .gte('entry_date', from)
        .lte('entry_date', to)
        .order('entry_date', { ascending: false })
        .limit(200);

      if (refFilter !== 'all') query = query.eq('reference_type', refFilter);

      const { data } = await query;
      if (data) setEntries(data as unknown as JournalEntry[]);
      setLoading(false);
    };

    fetchEntries();
  }, [supabase, refFilter, from, to]);

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return e.entry_number.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Journal</h1>
        <p className="text-sm text-text-secondary">Every financial event, balanced and immutable</p>
      </div>

      <div className="flex gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
        <select value={refFilter} onChange={(e) => setRefFilter(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
          {REF_TYPES.map((t) => (
            <option key={t} value={t}>{t === 'all' ? 'All types' : t}</option>
          ))}
        </select>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
        <input
          type="text"
          placeholder="Search entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          headline="No journal entries"
          message="Entries appear here automatically when loans disburse, payments arrive, or expenses post."
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div key={entry.id} className="glass-card">
              <button onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)} className="w-full p-4 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <Link href={`/accounting/journal/${entry.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-accent-primary hover:underline">
                      {entry.entry_number}
                    </Link>
                    <p className="text-sm text-text-secondary">{entry.description}</p>
                    <p className="text-xs text-text-muted">{entry.entry_date} — {entry.reference_type || 'Manual'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums text-text-primary">{formatKwacha(entry.total_debit)}</p>
                    <span className="mt-1 inline-block rounded-full bg-success/10 px-2 py-0.5 text-xs capitalize text-success">
                      {entry.status}
                    </span>
                  </div>
                </div>
              </button>

              {expandedId === entry.id && entry.journal_lines && (
                <div className="border-t border-border-subtle p-4">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-text-muted">
                        <th className="pb-1 font-medium">Account</th>
                        <th className="pb-1 text-right font-medium tabular-nums">Debit</th>
                        <th className="pb-1 text-right font-medium tabular-nums">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.journal_lines.map((line) => {
                        const acct = accountOf(line);
                        return (
                          <tr key={line.id} className="border-t border-border-subtle/50">
                            <td className="py-1">
                              <span className="font-mono text-xs text-text-muted">{acct.code}</span>
                              <span className="ml-2 text-text-primary">{acct.name}</span>
                            </td>
                            <td className="py-1 text-right tabular-nums text-text-primary">{line.debit > 0 ? formatKwacha(line.debit) : '-'}</td>
                            <td className="py-1 text-right tabular-nums text-text-primary">{line.credit > 0 ? formatKwacha(line.credit) : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
