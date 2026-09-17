'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { ArrowLeft } from 'lucide-react';

interface JournalLine {
  id: string;
  debit: number;
  credit: number;
  description: string | null;
  chart_of_accounts?: { code: string; name: string; account_type: string } | Array<{ code: string; name: string; account_type: string }> | null;
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

function accountOf(line: JournalLine) {
  const c = line.chart_of_accounts;
  if (Array.isArray(c)) return c[0] ?? { code: '?', name: 'Unknown', account_type: '' };
  return c ?? { code: '?', name: 'Unknown', account_type: '' };
}

export default function JournalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchEntry = async () => {
      const { data } = await supabase
        .from('journal_entries')
        .select('*, journal_lines(*, chart_of_accounts(code, name, account_type))')
        .eq('id', params.id)
        .single();
      if (data) setEntry(data as unknown as JournalEntry);
      setLoading(false);
    };
    fetchEntry();
  }, [params.id, supabase]);

  if (loading) return <div className="py-12 text-center text-text-muted">Loading...</div>;
  if (!entry) return <div className="py-12 text-center text-text-muted">Journal entry not found.</div>;

  const balanced = entry.total_debit === entry.total_credit;

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{entry.entry_number}</h1>
            <p className="text-sm text-text-secondary">{entry.description}</p>
            <p className="mt-1 text-xs text-text-muted">{entry.entry_date} — {entry.reference_type || 'Manual'}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${balanced ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {balanced ? 'Balanced' : 'Out of balance'}
          </span>
        </div>

        <table className="mt-6 w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-text-muted">
              <th className="pb-2 font-medium">Account</th>
              <th className="pb-2 text-right font-medium tabular-nums">Debit</th>
              <th className="pb-2 text-right font-medium tabular-nums">Credit</th>
            </tr>
          </thead>
          <tbody>
            {(entry.journal_lines || []).map((line) => {
              const acct = accountOf(line);
              return (
                <tr key={line.id} className="border-b border-border-subtle/50">
                  <td className="py-2">
                    <span className="font-mono text-xs text-text-muted">{acct.code}</span>
                    <span className="ml-2 text-text-primary">{acct.name}</span>
                    {line.description && <p className="text-xs text-text-muted">{line.description}</p>}
                  </td>
                  <td className="py-2 text-right tabular-nums text-text-primary">{line.debit > 0 ? formatKwacha(line.debit) : '-'}</td>
                  <td className="py-2 text-right tabular-nums text-text-primary">{line.credit > 0 ? formatKwacha(line.credit) : '-'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-semibold text-text-primary">
              <td className="py-2">Total</td>
              <td className="py-2 text-right tabular-nums">{formatKwacha(entry.total_debit)}</td>
              <td className="py-2 text-right tabular-nums">{formatKwacha(entry.total_credit)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
