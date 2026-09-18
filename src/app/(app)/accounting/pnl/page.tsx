'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { EmptyState } from '@/components/ui/empty-state';
import { summarizePl, type PlSummary, type StatementLine } from '@/lib/accounting/statements';
import { ChartColumn, Printer } from 'lucide-react';

interface RawLine {
  debit: number;
  credit: number;
  chart_of_accounts: { code: string; name: string; account_type: StatementLine['accountType'] } | Array<{ code: string; name: string; account_type: StatementLine['accountType'] }>;
}

function toStatement(lines: RawLine[]): StatementLine[] {
  return lines.map((l) => {
    const a = Array.isArray(l.chart_of_accounts) ? l.chart_of_accounts[0]! : l.chart_of_accounts;
    return { accountCode: a.code, accountName: a.name, accountType: a.account_type, debitKwacha: l.debit, creditKwacha: l.credit };
  });
}

async function fetchRange(supabase: ReturnType<typeof createClient>, from: string, to: string): Promise<StatementLine[]> {
  const { data } = await supabase
    .from('journal_lines')
    .select('debit, credit, chart_of_accounts!inner(code, name, account_type), journal_entries!inner(entry_date)')
    .gte('journal_entries.entry_date', from)
    .lte('journal_entries.entry_date', to);
  return toStatement((data || []) as unknown as RawLine[]);
}

function shiftMonth(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().split('T')[0]!;
}

export default function PnlPage() {
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]!;
  const today = new Date().toISOString().split('T')[0]!;
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [current, setCurrent] = useState<PlSummary | null>(null);
  const [previous, setPrevious] = useState<PlSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const [cur, prev] = await Promise.all([
        fetchRange(supabase, from, to).then(summarizePl),
        fetchRange(supabase, shiftMonth(from, -1), shiftMonth(to, -1)).then(summarizePl),
      ]);
      setCurrent(cur);
      setPrevious(prev);
      setLoading(false);
    };
    run();
  }, [supabase, from, to]);

  const income = current?.byCategory.filter((c) => c.type === 'revenue') || [];
  const expenses = current?.byCategory.filter((c) => c.type === 'expense') || [];
  const empty = current && current.incomeNgwee === 0 && current.expenseNgwee === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Profit & Loss</h1>
          <p className="text-sm text-text-secondary">Income vs expense for the period</p>
        </div>
        <button onClick={() => window.print()} className="no-print flex items-center gap-2 rounded-[var(--radius-button)] border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:bg-surface-glass">
          <Printer size={16} />
          Print
        </button>
      </div>

      <div className="no-print flex gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : empty ? (
        <EmptyState icon={ChartColumn} headline="No activity in this period" message="Post income or expenses to see the profit and loss statement." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-4">
              <p className="text-xs text-text-muted">Income</p>
              <p className="text-lg font-bold tabular-nums text-success">{formatKwacha((current?.incomeNgwee || 0) / 100)}</p>
              <p className="text-xs text-text-muted">Prev: {formatKwacha((previous?.incomeNgwee || 0) / 100)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-text-muted">Expenses</p>
              <p className="text-lg font-bold tabular-nums text-danger">{formatKwacha((current?.expenseNgwee || 0) / 100)}</p>
              <p className="text-xs text-text-muted">Prev: {formatKwacha((previous?.expenseNgwee || 0) / 100)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-text-muted">Net Profit</p>
              <p className={`text-lg font-bold tabular-nums ${(current?.netNgwee || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatKwacha((current?.netNgwee || 0) / 100)}
              </p>
              <p className="text-xs text-text-muted">Prev: {formatKwacha((previous?.netNgwee || 0) / 100)}</p>
            </div>
          </div>

          <div className="glass-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-secondary">Income by Category</h2>
            {income.map((c) => (
              <div key={c.accountCode} className="flex items-center justify-between border-b border-border-subtle/50 py-2 text-sm">
                <span className="text-text-primary">{c.accountCode} — {c.accountName}</span>
                <span className="tabular-nums text-text-primary">{formatKwacha(c.totalNgwee / 100)}</span>
              </div>
            ))}
          </div>

          <div className="glass-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-text-secondary">Expenses by Category</h2>
            {expenses.map((c) => (
              <div key={c.accountCode} className="flex items-center justify-between border-b border-border-subtle/50 py-2 text-sm">
                <span className="text-text-primary">{c.accountCode} — {c.accountName}</span>
                <span className="tabular-nums text-text-primary">{formatKwacha(c.totalNgwee / 100)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
