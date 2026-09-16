'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { Search, Plus } from 'lucide-react';

interface JournalEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  description: string;
  reference_type: string | null;
  reference_id: string | null;
  total_debit: number;
  total_credit: number;
  status: string;
  created_by: string | null;
  journal_lines?: Array<{
    id: string;
    account_code: string;
    account_name: string;
    debit: number;
    credit: number;
    description: string | null;
  }>;
}

export default function JournalEntriesPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchEntries = async () => {
      const { data } = await supabase
        .from('journal_entries')
        .select('*, journal_lines(*)')
        .order('entry_date', { ascending: false });

      if (data) setEntries(data);
      setLoading(false);
    };

    fetchEntries();
  }, [supabase]);

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    return (
      e.entry_number.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.reference_type?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Journal Entries</h1>
        <button className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover">
          <Plus size={16} />
          New Entry
        </button>
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
        <div className="py-12 text-center text-text-muted">No journal entries found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div key={entry.id} className="glass-card">
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-text-primary">{entry.entry_number}</h3>
                    <p className="text-sm text-text-secondary">{entry.description}</p>
                    <p className="text-xs text-text-muted">{entry.entry_date} — {entry.reference_type || 'Manual'}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-4">
                      <div>
                        <p className="text-xs text-text-muted">Debit</p>
                        <p className="text-sm font-medium text-text-primary">{formatKwacha(entry.total_debit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted">Credit</p>
                        <p className="text-sm font-medium text-text-primary">{formatKwacha(entry.total_credit)}</p>
                      </div>
                    </div>
                    <span className="mt-1 inline-block rounded-full bg-success/10 px-2 py-0.5 text-xs text-success capitalize">
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
                        <th className="pb-1 font-medium text-right">Debit</th>
                        <th className="pb-1 font-medium text-right">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.journal_lines.map((line) => (
                        <tr key={line.id} className="border-t border-border-subtle/50">
                          <td className="py-1">
                            <span className="font-mono text-xs text-text-muted">{line.account_code}</span>
                            <span className="ml-2 text-text-primary">{line.account_name}</span>
                          </td>
                          <td className="py-1 text-right text-text-primary">{line.debit > 0 ? formatKwacha(line.debit) : '-'}</td>
                          <td className="py-1 text-right text-text-primary">{line.credit > 0 ? formatKwacha(line.credit) : '-'}</td>
                        </tr>
                      ))}
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
