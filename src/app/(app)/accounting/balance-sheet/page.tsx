'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { EmptyState } from '@/components/ui/empty-state';
import { summarizeBalanceSheet, type BalanceSheet, type StatementLine } from '@/lib/accounting/statements';
import { Scale, Printer } from 'lucide-react';

export default function BalanceSheetPage() {
  const [asAt, setAsAt] = useState(() => new Date().toISOString().split('T')[0]!);
  const [sheet, setSheet] = useState<BalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('journal_lines')
        .select('debit, credit, chart_of_accounts!inner(code, name, account_type), journal_entries!inner(entry_date)')
        .lte('journal_entries.entry_date', asAt);
      const lines: StatementLine[] = ((data || []) as Array<{
        debit: number; credit: number;
        chart_of_accounts: { code: string; name: string; account_type: StatementLine['accountType'] } | Array<{ code: string; name: string; account_type: StatementLine['accountType'] }>;
      }>).map((l) => {
        const a = Array.isArray(l.chart_of_accounts) ? l.chart_of_accounts[0]! : l.chart_of_accounts;
        return { accountCode: a.code, accountName: a.name, accountType: a.account_type, debitKwacha: l.debit, creditKwacha: l.credit };
      });
      setSheet(summarizeBalanceSheet(lines));
      setLoading(false);
    };
    run();
  }, [supabase, asAt]);

  const section = (type: 'asset' | 'liability' | 'equity', title: string) =>
    (sheet?.byAccount.filter((a) => a.type === type) || []).length > 0 && (
      <div className="glass-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-secondary">{title}</h2>
        {sheet!.byAccount.filter((a) => a.type === type).map((a) => (
          <div key={a.accountCode} className="flex items-center justify-between border-b border-border-subtle/50 py-2 text-sm">
            <span className="text-text-primary">{a.accountCode} — {a.accountName}</span>
            <span className="tabular-nums text-text-primary">{formatKwacha(a.totalNgwee / 100)}</span>
          </div>
        ))}
      </div>
    );

  const empty = sheet && sheet.assetsNgwee === 0 && sheet.liabilitiesNgwee === 0 && sheet.equityNgwee === 0 && sheet.retainedNgwee === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Balance Sheet</h1>
          <p className="text-sm text-text-secondary">Assets = Liabilities + Equity, as at a date</p>
        </div>
        <button onClick={() => window.print()} className="no-print flex items-center gap-2 rounded-[var(--radius-button)] border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:bg-surface-glass">
          <Printer size={16} />
          Print
        </button>
      </div>

      <div className="no-print flex gap-2">
        <input type="date" value={asAt} onChange={(e) => setAsAt(e.target.value)} className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : empty ? (
        <EmptyState icon={Scale} headline="Empty balance sheet" message="Post disbursements, payments or expenses to build the balance sheet." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card p-4">
              <p className="text-xs text-text-muted">Total Assets</p>
              <p className="text-lg font-bold tabular-nums text-text-primary">{formatKwacha((sheet?.assetsNgwee || 0) / 100)}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-text-muted">Liabilities + Equity</p>
              <p className="text-lg font-bold tabular-nums text-text-primary">
                {formatKwacha(((sheet?.liabilitiesNgwee || 0) + (sheet?.equityNgwee || 0) + (sheet?.retainedNgwee || 0)) / 100)}
              </p>
            </div>
          </div>

          {section('asset', 'Assets')}
          {section('liability', 'Liabilities')}
          {section('equity', 'Equity')}

          <div className="glass-card p-4">
            <div className="flex items-center justify-between py-2 text-sm">
              <span className="text-text-primary">Retained Earnings (profit to date)</span>
              <span className="tabular-nums text-text-primary">{formatKwacha((sheet?.retainedNgwee || 0) / 100)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-border-subtle pt-2 text-sm font-semibold">
              <span className="text-text-primary">Balance check</span>
              <span className={sheet?.balanced ? 'text-success' : 'text-danger'}>
                {sheet?.balanced ? 'Assets = Liabilities + Equity ✓' : 'OUT OF BALANCE'}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
