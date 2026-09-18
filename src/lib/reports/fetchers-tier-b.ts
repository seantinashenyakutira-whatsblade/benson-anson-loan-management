/**
 * reports/fetchers-tier-b.ts — Tier B report fetchers (Phase 9.5).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { summarizeBalanceSheet, summarizePl } from '@/lib/accounting/statements';
import type { ReportParams, ReportResult, ReportRow, ReportUser } from './types';

type Ctx = { sb: SupabaseClient; user: ReportUser; params: ReportParams; scope: { branchId: string; officerId: string } };

/** 11. Penalties with status, waived amounts, applied dates. */
export async function fetchPenaltiesReport(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  const { data } = await ctx.sb
    .from('penalties')
    .select('*, loans(loan_number, branch_id, customers(first_name, last_name))')
    .gte('calculation_date', ctx.params.from)
    .lte('calculation_date', ctx.params.to)
    .order('calculation_date', { ascending: false })
    .limit(2000);
  type PRow = {
    penalty_type: string; amount: number; paid_amount: number; calculation_date: string;
    description: string | null; status: string;
    loans?: { loan_number: string; branch_id: string | null; customers?: { first_name: string; last_name: string } | null } | null;
  };
  let list = ((data || []) as unknown as PRow[]).filter(
    (p) => (ctx.scope.branchId === 'all' || p.loans?.branch_id === ctx.scope.branchId) &&
      (ctx.params.status === 'all' || p.status === ctx.params.status),
  );
  let tAmt = 0;
  let tPaid = 0;
  const rows: ReportRow[] = list.map((p) => {
    tAmt += Number(p.amount);
    tPaid += Number(p.paid_amount);
    const waived = p.status === 'waived' ? Number(p.amount) : 0;
    return {
      date: p.calculation_date,
      loan_no: p.loans?.loan_number || '—',
      customer: p.loans?.customers ? `${p.loans.customers.first_name} ${p.loans.customers.last_name}` : '—',
      type: p.penalty_type.replace(/_/g, ' '),
      amount: Number(p.amount),
      paid: Number(p.paid_amount),
      waived,
      status: p.status,
      description: p.description,
    };
  });
  void list;
  return {
    columns: [
      { key: 'date', label: 'Applied Date', kind: 'date' },
      { key: 'loan_no', label: 'Loan No', kind: 'text' },
      { key: 'customer', label: 'Customer', kind: 'text' },
      { key: 'type', label: 'Type', kind: 'text' },
      { key: 'amount', label: 'Amount', kind: 'money' },
      { key: 'paid', label: 'Paid', kind: 'money' },
      { key: 'waived', label: 'Waived', kind: 'money' },
      { key: 'status', label: 'Status', kind: 'text' },
      { key: 'description', label: 'Description', kind: 'text' },
    ],
    rows,
    totals: { date: 'TOTAL', loan_no: '', customer: '', type: '', amount: tAmt, paid: tPaid, waived: '', status: '', description: '' },
  };
}

/** 12. P&L as a report (same source as /accounting/pnl, date-filtered). */
export async function fetchPlReport(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  let q = ctx.sb
    .from('journal_lines')
    .select('debit, credit, chart_of_accounts!inner(code, name, account_type), journal_entries!inner(entry_date, branch_id)')
    .gte('journal_entries.entry_date', ctx.params.from)
    .lte('journal_entries.entry_date', ctx.params.to);
  if (ctx.scope.branchId !== 'all') q = q.eq('journal_entries.branch_id', ctx.scope.branchId);
  const { data } = await q;
  const lines = ((data || []) as Array<{
    debit: number; credit: number;
    chart_of_accounts: { code: string; name: string; account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' } | Array<{ code: string; name: string; account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' }>;
  }>).map((l) => {
    const a = Array.isArray(l.chart_of_accounts) ? l.chart_of_accounts[0]! : l.chart_of_accounts;
    return { accountCode: a.code, accountName: a.name, accountType: a.account_type, debitKwacha: l.debit, creditKwacha: l.credit };
  });
  const s = summarizePl(lines);
  const rows: ReportRow[] = s.byCategory.map((c) => ({
    account: `${c.accountCode} — ${c.accountName}`,
    type: c.type,
    total: c.totalNgwee / 100,
  }));
  rows.push({ account: 'TOTAL INCOME', type: 'revenue', total: s.incomeNgwee / 100 });
  rows.push({ account: 'TOTAL EXPENSE', type: 'expense', total: s.expenseNgwee / 100 });
  rows.push({ account: 'NET PROFIT', type: 'revenue', total: s.netNgwee / 100 });
  return {
    columns: [
      { key: 'account', label: 'Account', kind: 'text' },
      { key: 'type', label: 'Type', kind: 'text' },
      { key: 'total', label: 'Total', kind: 'money' },
    ],
    rows,
    totals: { account: 'NET PROFIT', type: '', total: s.netNgwee / 100 },
  };
}

/** 13. Balance sheet as a report (as-at `to` date). */
export async function fetchBalanceSheetReport(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  let q = ctx.sb
    .from('journal_lines')
    .select('debit, credit, chart_of_accounts!inner(code, name, account_type), journal_entries!inner(entry_date, branch_id)')
    .lte('journal_entries.entry_date', ctx.params.to);
  if (ctx.scope.branchId !== 'all') q = q.eq('journal_entries.branch_id', ctx.scope.branchId);
  const { data } = await q;
  const lines = ((data || []) as Array<{
    debit: number; credit: number;
    chart_of_accounts: { code: string; name: string; account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' } | Array<{ code: string; name: string; account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' }>;
  }>).map((l) => {
    const a = Array.isArray(l.chart_of_accounts) ? l.chart_of_accounts[0]! : l.chart_of_accounts;
    return { accountCode: a.code, accountName: a.name, accountType: a.account_type, debitKwacha: l.debit, creditKwacha: l.credit };
  });
  const bs = summarizeBalanceSheet(lines);
  const rows: ReportRow[] = bs.byAccount.map((a) => ({ account: `${a.accountCode} — ${a.accountName}`, type: a.type, balance: a.totalNgwee / 100 }));
  rows.push({ account: 'Retained Earnings', type: 'equity', balance: bs.retainedNgwee / 100 });
  return {
    columns: [
      { key: 'account', label: 'Account', kind: 'text' },
      { key: 'type', label: 'Type', kind: 'text' },
      { key: 'balance', label: 'Balance', kind: 'money' },
    ],
    rows,
    totals: {
      account: bs.balanced ? 'BALANCED: A = L + E' : 'OUT OF BALANCE',
      type: '',
      balance: bs.assetsNgwee / 100,
    },
  };
}

/** 14. Daily collection summary per branch/officer. */
export async function fetchCollectionSummary(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  let q = ctx.sb
    .from('v_daily_collection_summary')
    .select('*')
    .gte('collection_date', ctx.params.from)
    .lte('collection_date', ctx.params.to)
    .order('collection_date', { ascending: false })
    .limit(2000);
  if (ctx.scope.branchId !== 'all') q = q.eq('branch_id', ctx.scope.branchId);
  if (ctx.scope.officerId !== 'all') q = q.eq('officer_id', ctx.scope.officerId);
  const { data } = await q;
  type SRow = {
    collection_date: string; branch_name: string; officer_name: string;
    payment_count: number; principal_collected: number; interest_collected: number;
    fees_collected: number; penalties_collected: number; total_collected: number;
  };
  let t = 0;
  let n = 0;
  const rows: ReportRow[] = ((data || []) as unknown as SRow[]).map((s) => {
    t += Number(s.total_collected);
    n += Number(s.payment_count);
    return {
      date: s.collection_date,
      branch: s.branch_name || '—',
      officer: s.officer_name || '—',
      payments: s.payment_count,
      principal: Number(s.principal_collected),
      interest: Number(s.interest_collected),
      fees: Number(s.fees_collected),
      penalties: Number(s.penalties_collected),
      total: Number(s.total_collected),
    };
  });
  return {
    columns: [
      { key: 'date', label: 'Date', kind: 'date' },
      { key: 'branch', label: 'Branch', kind: 'text' },
      { key: 'officer', label: 'Officer', kind: 'text' },
      { key: 'payments', label: 'Payments', kind: 'number' },
      { key: 'principal', label: 'Principal', kind: 'money' },
      { key: 'interest', label: 'Interest', kind: 'money' },
      { key: 'fees', label: 'Fees', kind: 'money' },
      { key: 'penalties', label: 'Penalties', kind: 'money' },
      { key: 'total', label: 'Total', kind: 'money' },
    ],
    rows,
    totals: { date: 'TOTAL', branch: '', officer: '', payments: n, principal: '', interest: '', fees: '', penalties: '', total: Math.round(t * 100) / 100 },
  };
}
