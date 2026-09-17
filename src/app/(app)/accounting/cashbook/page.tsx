'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha, toNgwee } from '@/lib/money';
import { EmptyState } from '@/components/ui/empty-state';
import { Wallet } from 'lucide-react';

const CASH_CODES = ['1000', '1010', '1020', '1030'];

interface CashRow {
  date: string;
  description: string;
  ref: string;
  inKwacha: number;
  outKwacha: number;
}

export default function CashbookPage() {
  const [accounts, setAccounts] = useState<Array<{ code: string; name: string }>>([]);
  const [account, setAccount] = useState('1000');
  const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]!);
  const [to, setTo] = useState(() => new Date().toISOString().split('T')[0]!);
  const [rows, setRows] = useState<CashRow[]>([]);
  const [opening, setOpening] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('chart_of_accounts')
      .select('code, name')
      .in('code', CASH_CODES)
      .order('code')
      .then(({ data }) => {
        if (data) setAccounts(data);
      });
  }, [supabase]);

  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      const { data: acct } = await supabase.from('chart_of_accounts').select('id').eq('code', account).single();
      if (!acct) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: prior } = await supabase
        .from('journal_lines')
        .select('debit, credit, journal_entries!inner(entry_date)')
        .eq('account_id', acct.id)
        .lt('journal_entries.entry_date', from);
      setOpening((prior || []).reduce((s, l) => s + toNgwee(l.debit) - toNgwee(l.credit), 0) / 100);

      const { data } = await supabase
        .from('journal_lines')
        .select('debit, credit, description, journal_entries!inner(entry_number, entry_date, description)')
        .eq('account_id', acct.id)
        .gte('journal_entries.entry_date', from)
        .lte('journal_entries.entry_date', to)
        .order('entry_date', { referencedTable: 'journal_entries', ascending: true });
      const mapped: CashRow[] = (data || []).map((l) => {
        const e = l.journal_entries as unknown as { entry_number: string; entry_date: string; description: string };
        return {
          date: e.entry_date,
          description: l.description || e.description,
          ref: e.entry_number,
          inKwacha: l.debit,
          outKwacha: l.credit,
        };
      });
      setRows(mapped);
      setLoading(false);
    };
    fetchBook();
  }, [supabase, account, from, to]);

  let running = toNgwee(opening);
  const withBalance = rows.map((r) => {
    running = running + toNgwee(r.inKwacha) - toNgwee(r.outKwacha);
    return { ...r, balance: running / 100 };
  });
  const closing = withBalance.length > 0 ? withBalance[withBalance.length - 1]!.balance : opening;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Cash Book</h1>
        <p className="text-sm text-text-secondary">Running balance per cash account</p>
      </div>

      <div className="glass-card grid grid-cols-2 gap-4 p-4">
        <div>
          <p className="text-xs text-text-muted">Opening Balance</p>
          <p className="text-lg font-bold tabular-nums text-text-primary">{formatKwacha(opening)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-muted">Closing Balance</p>
          <p className="text-lg font-bold tabular-nums text-success">{formatKwacha(closing)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <select value={account} onChange={(e) => setAccount(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
          {accounts.map((a) => (
            <option key={a.code} value={a.code}>{a.code} — {a.name}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : withBalance.length === 0 ? (
        <EmptyState icon={Wallet} headline="No cash movements" message="Postings to this account in the selected range will appear here with a running balance." />
      ) : (
        <div className="glass-card overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Description</th>
                <th className="pb-2 font-medium">Ref</th>
                <th className="pb-2 text-right font-medium tabular-nums">In</th>
                <th className="pb-2 text-right font-medium tabular-nums">Out</th>
                <th className="pb-2 text-right font-medium tabular-nums">Balance</th>
              </tr>
            </thead>
            <tbody>
              {withBalance.map((r, i) => (
                <tr key={i} className="border-b border-border-subtle/50">
                  <td className="py-2 text-text-secondary">{r.date}</td>
                  <td className="py-2 text-text-primary">{r.description}</td>
                  <td className="py-2 font-mono text-xs text-text-muted">{r.ref}</td>
                  <td className="py-2 text-right tabular-nums text-success">{r.inKwacha > 0 ? formatKwacha(r.inKwacha) : '-'}</td>
                  <td className="py-2 text-right tabular-nums text-danger">{r.outKwacha > 0 ? formatKwacha(r.outKwacha) : '-'}</td>
                  <td className="py-2 text-right font-medium tabular-nums text-text-primary">{formatKwacha(r.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
