/**
 * reports/fetchers.ts — Server-side report data fetchers (Phase 9.4).
 * Each fetcher uses the authenticated user's client so RLS always applies,
 * then applies role scope on top. Numbers are raw kwacha.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReportParams, ReportResult, ReportRow, ReportUser } from './types';

type Ctx = { sb: SupabaseClient; user: ReportUser; params: ReportParams; scope: { branchId: string; officerId: string } };

const ACTIVE_LOAN_STATUSES = ['disbursed', 'performing', 'at_risk', 'overdue'];

interface LoanRow {
  id: string;
  loan_number: string;
  customer_id: string;
  branch_id: string | null;
  officer_id: string | null;
  principal_amount: number;
  total_interest: number;
  total_repayable: number;
  amount_paid: number;
  outstanding_balance: number;
  arrears_amount: number;
  days_overdue: number;
  status: string;
  health: string;
  disbursement_date: string | null;
  disbursement_method: string | null;
  maturity_date: string | null;
  customers?: { first_name: string; last_name: string; phone: string; branch_id: string | null } | null;
}

function customerName(l: LoanRow): string {
  return `${l.customers?.first_name ?? ''} ${l.customers?.last_name ?? ''}`.trim() || '—';
}

async function branchMap(sb: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await sb.from('branches').select('id, name');
  const m: Record<string, string> = {};
  for (const b of (data || []) as Array<{ id: string; name: string }>) m[b.id] = b.name;
  return m;
}

async function officerMap(sb: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await sb.from('profiles').select('id, full_name').in('role', ['loan_officer', 'branch_manager', 'owner']);
  const m: Record<string, string> = {};
  for (const p of (data || []) as Array<{ id: string; full_name: string }>) m[p.id] = p.full_name;
  return m;
}

function filterLoans<T extends { branch_id: string | null; officer_id: string | null }>(rows: T[], scope: Ctx['scope']): T[] {
  return rows.filter(
    (r) =>
      (scope.branchId === 'all' || r.branch_id === scope.branchId) &&
      (scope.officerId === 'all' || r.officer_id === scope.officerId),
  );
}

async function activeLoans(ctx: Ctx): Promise<LoanRow[]> {
  const { data } = await ctx.sb
    .from('loans')
    .select('*, customers(first_name, last_name, phone, branch_id)')
    .in('status', ACTIVE_LOAN_STATUSES)
    .order('created_at', { ascending: false })
    .limit(2000);
  const rows = ((data || []) as unknown as LoanRow[]).map((l) => ({
    ...l,
    branch_id: l.branch_id ?? l.customers?.branch_id ?? null,
  }));
  return filterLoans(rows, ctx.scope);
}

/** 1. Expected vs Actual — per active loan with shortfall. */
export async function fetchExpectedVsActual(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  const loans = await activeLoans(ctx);
  const branches = await branchMap(ctx.sb);
  const officers = await officerMap(ctx.sb);
  const ids = loans.map((l) => l.id);
  const dueByLoan: Record<string, number> = {};
  const paidByLoan: Record<string, number> = {};
  if (ids.length > 0) {
    const today = new Date().toISOString().split('T')[0]!;
    const { data: sched } = await ctx.sb.from('loan_schedule').select('loan_id, due_amount').in('loan_id', ids).lte('due_date', today);
    for (const s of (sched || []) as Array<{ loan_id: string; due_amount: number }>) {
      dueByLoan[s.loan_id] = (dueByLoan[s.loan_id] || 0) + Number(s.due_amount);
    }
    const { data: allocs } = await ctx.sb.from('payment_allocations').select('loan_id, amount').in('loan_id', ids);
    for (const a of (allocs || []) as Array<{ loan_id: string; amount: number }>) {
      paidByLoan[a.loan_id] = (paidByLoan[a.loan_id] || 0) + Number(a.amount);
    }
  }
  let tExpected = 0;
  let tActual = 0;
  const rows: ReportRow[] = loans.map((l) => {
    const expected = dueByLoan[l.id] || 0;
    const actual = paidByLoan[l.id] || 0;
    tExpected += expected;
    tActual += actual;
    return {
      branch: l.branch_id ? branches[l.branch_id] || '—' : '—',
      officer: l.officer_id ? officers[l.officer_id] || '—' : '—',
      customer: customerName(l),
      loan_no: l.loan_number,
      expected: expected,
      actual: actual,
      shortfall: Math.max(expected - actual, 0),
      days_overdue: l.days_overdue,
      health: l.health,
    };
  });
  return {
    columns: [
      { key: 'branch', label: 'Branch', kind: 'text' },
      { key: 'officer', label: 'Officer', kind: 'text' },
      { key: 'customer', label: 'Customer', kind: 'text' },
      { key: 'loan_no', label: 'Loan No', kind: 'text' },
      { key: 'expected', label: 'Expected to Date', kind: 'money' },
      { key: 'actual', label: 'Actual Collected', kind: 'money' },
      { key: 'shortfall', label: 'Shortfall', kind: 'money' },
      { key: 'days_overdue', label: 'Days Overdue', kind: 'number' },
      { key: 'health', label: 'Health', kind: 'text' },
    ],
    rows,
    totals: { branch: 'TOTAL', officer: '', customer: '', loan_no: `${rows.length} loans`, expected: tExpected, actual: tActual, shortfall: Math.max(tExpected - tActual, 0), days_overdue: null, health: '' },
  };
}

/** 2. Default arrears — loans with arrears > 0. */
export async function fetchDefaultArrears(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  const { data } = await ctx.sb
    .from('loans')
    .select('*, customers(first_name, last_name, phone, branch_id)')
    .gt('arrears_amount', 0)
    .order('arrears_amount', { ascending: false })
    .limit(2000);
  const officers = await officerMap(ctx.sb);
  const branches = await branchMap(ctx.sb);
  const rows0 = ((data || []) as unknown as LoanRow[]).map((l) => ({ ...l, branch_id: l.branch_id ?? l.customers?.branch_id ?? null }));
  const loans = filterLoans(rows0, ctx.scope);
  const ids = loans.map((l) => l.id);
  const lastPay: Record<string, string> = {};
  const penDue: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: pays } = await ctx.sb.from('payments').select('loan_id, paid_at').in('loan_id', ids).order('paid_at', { ascending: false });
    for (const p of (pays || []) as Array<{ loan_id: string; paid_at: string }>) {
      if (!(p.loan_id in lastPay)) lastPay[p.loan_id] = p.paid_at.split('T')[0]!;
    }
    const { data: pens } = await ctx.sb.from('penalties').select('loan_id, amount, paid_amount').in('loan_id', ids).eq('status', 'active');
    for (const p of (pens || []) as Array<{ loan_id: string; amount: number; paid_amount: number }>) {
      penDue[p.loan_id] = (penDue[p.loan_id] || 0) + (Number(p.amount) - Number(p.paid_amount));
    }
  }
  let tArrears = 0;
  let tPen = 0;
  const rows: ReportRow[] = loans.map((l) => {
    tArrears += Number(l.arrears_amount);
    tPen += penDue[l.id] || 0;
    return {
      loan_no: l.loan_number,
      customer: customerName(l),
      officer: l.officer_id ? officers[l.officer_id] || '—' : '—',
      branch: l.branch_id ? branches[l.branch_id] || '—' : '—',
      days_overdue: l.days_overdue,
      arrears: Number(l.arrears_amount),
      penalties: penDue[l.id] || 0,
      last_payment: lastPay[l.id] || null,
      health: l.health,
    };
  });
  if (ctx.params.status !== 'all') {
    const s = ctx.params.status;
    return {
      columns: colsArrears(),
      rows: rows.filter((r) => r.health === s),
      totals: { loan_no: 'TOTAL', customer: '', officer: '', branch: '', days_overdue: null, arrears: tArrears, penalties: tPen, last_payment: null, health: '' },
    };
  }
  return {
    columns: colsArrears(),
    rows,
    totals: { loan_no: 'TOTAL', customer: '', officer: '', branch: '', days_overdue: null, arrears: tArrears, penalties: tPen, last_payment: null, health: '' },
  };
}

function colsArrears(): ReportResult['columns'] {
  return [
    { key: 'loan_no', label: 'Loan No', kind: 'text' },
    { key: 'customer', label: 'Customer', kind: 'text' },
    { key: 'officer', label: 'Officer', kind: 'text' },
    { key: 'branch', label: 'Branch', kind: 'text' },
    { key: 'days_overdue', label: 'Days Overdue', kind: 'number' },
    { key: 'arrears', label: 'Arrears Amount', kind: 'money' },
    { key: 'penalties', label: 'Penalties Due', kind: 'money' },
    { key: 'last_payment', label: 'Last Payment', kind: 'date' },
    { key: 'health', label: 'Health', kind: 'text' },
  ];
}

/** 3. Outstanding — every active loan. */
export async function fetchOutstanding(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  let loans = await activeLoans(ctx);
  if (ctx.params.status !== 'all') loans = loans.filter((l) => l.status === ctx.params.status);
  let tP = 0;
  let tI = 0;
  let tR = 0;
  let tPaid = 0;
  let tO = 0;
  const rows: ReportRow[] = loans.map((l) => {
    tP += Number(l.principal_amount);
    tI += Number(l.total_interest);
    tR += Number(l.total_repayable);
    tPaid += Number(l.amount_paid);
    tO += Number(l.outstanding_balance);
    return {
      loan_no: l.loan_number,
      customer: customerName(l),
      principal: Number(l.principal_amount),
      interest: Number(l.total_interest),
      repayable: Number(l.total_repayable),
      paid: Number(l.amount_paid),
      outstanding: Number(l.outstanding_balance),
      status: l.status,
    };
  });
  return {
    columns: [
      { key: 'loan_no', label: 'Loan No', kind: 'text' },
      { key: 'customer', label: 'Customer', kind: 'text' },
      { key: 'principal', label: 'Principal', kind: 'money' },
      { key: 'interest', label: 'Interest', kind: 'money' },
      { key: 'repayable', label: 'Total Repayable', kind: 'money' },
      { key: 'paid', label: 'Paid', kind: 'money' },
      { key: 'outstanding', label: 'Outstanding', kind: 'money' },
      { key: 'status', label: 'Status', kind: 'text' },
    ],
    rows,
    totals: { loan_no: 'TOTAL', customer: `${rows.length} loans`, principal: tP, interest: tI, repayable: tR, paid: tPaid, outstanding: tO, status: '' },
  };
}

/** 4. Customers with aggregates. */
export async function fetchCustomersReport(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  let cq = ctx.sb.from('customers').select('id, first_name, last_name, phone, status, branch_id').order('created_at', { ascending: false }).limit(2000);
  if (ctx.scope.branchId !== 'all') cq = cq.eq('branch_id', ctx.scope.branchId);
  const { data: customers } = await cq;
  const branches = await branchMap(ctx.sb);
  const { data: loans } = await ctx.sb.from('loans').select('customer_id, principal_amount, amount_paid, status');
  const agg: Record<string, { n: number; borrowed: number; repaid: number }> = {};
  for (const l of (loans || []) as Array<{ customer_id: string; principal_amount: number; amount_paid: number }>) {
    const a = agg[l.customer_id] || { n: 0, borrowed: 0, repaid: 0 };
    a.n += 1;
    a.borrowed += Number(l.principal_amount);
    a.repaid += Number(l.amount_paid);
    agg[l.customer_id] = a;
  }
  const list = (customers || []) as Array<{ id: string; first_name: string; last_name: string; phone: string; status: string; branch_id: string | null }>;
  const rows: ReportRow[] = list.map((c) => ({
    customer: `${c.first_name} ${c.last_name}`,
    phone: c.phone,
    branch: c.branch_id ? branches[c.branch_id] || '—' : '—',
    loans: agg[c.id]?.n || 0,
    borrowed: agg[c.id]?.borrowed || 0,
    repaid: agg[c.id]?.repaid || 0,
    status: c.status,
  }));
  return {
    columns: [
      { key: 'customer', label: 'Customer', kind: 'text' },
      { key: 'phone', label: 'Phone', kind: 'text' },
      { key: 'branch', label: 'Branch', kind: 'text' },
      { key: 'loans', label: 'Loans', kind: 'number' },
      { key: 'borrowed', label: 'Total Borrowed', kind: 'money' },
      { key: 'repaid', label: 'Total Repaid', kind: 'money' },
      { key: 'status', label: 'Status', kind: 'text' },
    ],
    rows,
    totals: { customer: 'TOTAL', phone: '', branch: '', loans: rows.reduce((s, r) => s + Number(r.loans), 0), borrowed: rows.reduce((s, r) => s + Number(r.borrowed), 0), repaid: rows.reduce((s, r) => s + Number(r.repaid), 0), status: '' },
  };
}

/** 5. Active loans with next due date. */
export async function fetchActiveLoans(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  const { data } = await ctx.sb
    .from('loans')
    .select('*, customers(first_name, last_name, branch_id)')
    .in('status', ['performing', 'at_risk', 'overdue'])
    .order('created_at', { ascending: false })
    .limit(2000);
  const officers = await officerMap(ctx.sb);
  const rows0 = ((data || []) as unknown as LoanRow[]).map((l) => ({ ...l, branch_id: l.branch_id ?? l.customers?.branch_id ?? null }));
  const loans = filterLoans(rows0, ctx.scope);
  const ids = loans.map((l) => l.id);
  const nextDue: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: sched } = await ctx.sb.from('loan_schedule').select('loan_id, due_date').in('loan_id', ids).neq('status', 'paid').order('due_date');
    for (const s of (sched || []) as Array<{ loan_id: string; due_date: string }>) {
      if (!(s.loan_id in nextDue)) nextDue[s.loan_id] = s.due_date;
    }
  }
  let tR = 0;
  let tB = 0;
  const rows: ReportRow[] = loans.map((l) => {
    tR += Number(l.total_repayable);
    tB += Number(l.outstanding_balance);
    return {
      loan_no: l.loan_number,
      customer: customerName(l),
      officer: l.officer_id ? officers[l.officer_id] || '—' : '—',
      disbursed: l.disbursement_date,
      repayable: Number(l.total_repayable),
      next_due: nextDue[l.id] || null,
      balance: Number(l.outstanding_balance),
      health: l.health,
    };
  });
  return {
    columns: [
      { key: 'loan_no', label: 'Loan No', kind: 'text' },
      { key: 'customer', label: 'Customer', kind: 'text' },
      { key: 'officer', label: 'Officer', kind: 'text' },
      { key: 'disbursed', label: 'Disbursed', kind: 'date' },
      { key: 'repayable', label: 'Total Repayable', kind: 'money' },
      { key: 'next_due', label: 'Next Due', kind: 'date' },
      { key: 'balance', label: 'Balance', kind: 'money' },
      { key: 'health', label: 'Health', kind: 'text' },
    ],
    rows,
    totals: { loan_no: 'TOTAL', customer: `${rows.length} loans`, officer: '', disbursed: null, repayable: tR, next_due: null, balance: tB, health: '' },
  };
}

/** 6. Disbursements in range. */
export async function fetchDisbursements(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  let q = ctx.sb
    .from('loans')
    .select('*, customers(first_name, last_name, branch_id)')
    .gte('disbursement_date', ctx.params.from)
    .lte('disbursement_date', ctx.params.to)
    .order('disbursement_date', { ascending: false })
    .limit(2000);
  const { data } = await q;
  const officers = await officerMap(ctx.sb);
  const branches = await branchMap(ctx.sb);
  const rows0 = ((data || []) as unknown as LoanRow[]).map((l) => ({ ...l, branch_id: l.branch_id ?? l.customers?.branch_id ?? null }));
  const loans = filterLoans(rows0, ctx.scope);
  let t = 0;
  const rows: ReportRow[] = loans.map((l) => {
    t += Number(l.principal_amount);
    return {
      date: l.disbursement_date,
      loan_no: l.loan_number,
      customer: customerName(l),
      amount: Number(l.principal_amount),
      method: (l as unknown as { disbursement_method: string | null }).disbursement_method || '—',
      officer: l.officer_id ? officers[l.officer_id] || '—' : '—',
      branch: l.branch_id ? branches[l.branch_id] || '—' : '—',
    };
  });
  return {
    columns: [
      { key: 'date', label: 'Date', kind: 'date' },
      { key: 'loan_no', label: 'Loan No', kind: 'text' },
      { key: 'customer', label: 'Customer', kind: 'text' },
      { key: 'amount', label: 'Amount', kind: 'money' },
      { key: 'method', label: 'Method', kind: 'text' },
      { key: 'officer', label: 'Officer', kind: 'text' },
      { key: 'branch', label: 'Branch', kind: 'text' },
    ],
    rows,
    totals: { date: 'TOTAL', loan_no: '', customer: '', amount: t, method: '', officer: '', branch: '' },
  };
}

/** 7. Repayments in range. */
export async function fetchRepayments(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  const { data } = await ctx.sb
    .from('payments')
    .select('*, loans(loan_number, officer_id, branch_id, customers(first_name, last_name, branch_id))')
    .gte('paid_at', ctx.params.from)
    .lte('paid_at', ctx.params.to + 'T23:59:59')
    .order('paid_at', { ascending: false })
    .limit(2000);
  const officers = await officerMap(ctx.sb);
  const branches = await branchMap(ctx.sb);
  const byId: Record<string, string> = {};
  const { data: profs } = await ctx.sb.from('profiles').select('id, full_name');
  for (const p of (profs || []) as Array<{ id: string; full_name: string }>) byId[p.id] = p.full_name;
  type PRow = {
    payment_number: string; amount: number; paid_at: string; payment_method: string; recorded_by: string | null;
    loans?: { loan_number: string; officer_id: string | null; branch_id: string | null; customers?: { first_name: string; last_name: string; branch_id: string | null } | null } | null;
  };
  let t = 0;
  const rows: ReportRow[] = [];
  for (const p of ((data || []) as unknown as PRow[])) {
    const branchId = p.loans?.branch_id ?? p.loans?.customers?.branch_id ?? null;
    if (ctx.scope.branchId !== 'all' && branchId !== ctx.scope.branchId) continue;
    if (ctx.scope.officerId !== 'all' && p.loans?.officer_id !== ctx.scope.officerId) continue;
    t += Number(p.amount);
    rows.push({
      date: p.paid_at.split('T')[0]!,
      receipt: p.payment_number,
      customer: p.loans?.customers ? `${p.loans.customers.first_name} ${p.loans.customers.last_name}` : '—',
      loan_no: p.loans?.loan_number || '—',
      amount: Number(p.amount),
      method: p.payment_method.replace(/_/g, ' '),
      recorded_by: (p.recorded_by && byId[p.recorded_by]) || '—',
      branch: branchId ? branches[branchId] || '—' : '—',
    });
  }
  void officers;
  return {
    columns: [
      { key: 'date', label: 'Date', kind: 'date' },
      { key: 'receipt', label: 'Receipt No', kind: 'text' },
      { key: 'customer', label: 'Customer', kind: 'text' },
      { key: 'loan_no', label: 'Loan No', kind: 'text' },
      { key: 'amount', label: 'Amount', kind: 'money' },
      { key: 'method', label: 'Method', kind: 'text' },
      { key: 'recorded_by', label: 'Recorded By', kind: 'text' },
      { key: 'branch', label: 'Branch', kind: 'text' },
    ],
    rows,
    totals: { date: 'TOTAL', receipt: '', customer: '', loan_no: '', amount: t, method: '', recorded_by: '', branch: '' },
  };
}

/** 8. Income vs expense ledger with running balance. */
export async function fetchIncomeExpense(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  let iq = ctx.sb.from('income_records').select('income_date, category, amount, description').gte('income_date', ctx.params.from).lte('income_date', ctx.params.to).order('income_date');
  let eq = ctx.sb.from('expenses').select('expense_date, category, amount, description').gte('expense_date', ctx.params.from).lte('expense_date', ctx.params.to).order('expense_date');
  if (ctx.scope.branchId !== 'all') {
    iq = iq.eq('branch_id', ctx.scope.branchId);
    eq = eq.eq('branch_id', ctx.scope.branchId);
  }
  const [{ data: inc }, { data: exp }] = await Promise.all([iq, eq]);
  type Item = { date: string; category: string; type: string; amount: number; description: string };
  const items: Item[] = [
    ...((inc || []) as Array<{ income_date: string; category: string; amount: number; description: string }>).map((r) => ({ date: r.income_date, category: r.category, type: 'income', amount: Number(r.amount), description: r.description })),
    ...((exp || []) as Array<{ expense_date: string; category: string; amount: number; description: string }>).map((r) => ({ date: r.expense_date, category: r.category, type: 'expense', amount: Number(r.amount), description: r.description })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  let bal = 0;
  let tIn = 0;
  let tOut = 0;
  const rows: ReportRow[] = items.map((i) => {
    bal += i.type === 'income' ? i.amount : -i.amount;
    if (i.type === 'income') tIn += i.amount;
    else tOut += i.amount;
    return { date: i.date, category: i.category.replace(/_/g, ' '), type: i.type, amount: i.amount, description: i.description, balance: Math.round(bal * 100) / 100 };
  });
  return {
    columns: [
      { key: 'date', label: 'Date', kind: 'date' },
      { key: 'category', label: 'Category', kind: 'text' },
      { key: 'type', label: 'Type', kind: 'text' },
      { key: 'amount', label: 'Amount', kind: 'money' },
      { key: 'description', label: 'Description', kind: 'text' },
      { key: 'balance', label: 'Running Balance', kind: 'money' },
    ],
    rows,
    totals: { date: 'TOTAL', category: '', type: '', amount: Math.round((tIn - tOut) * 100) / 100, description: `In ${tIn} / Out ${tOut}`, balance: Math.round(bal * 100) / 100 },
  };
}

/** 9. Officer performance aggregates. */
export async function fetchOfficerPerformance(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  let pq = ctx.sb.from('profiles').select('id, full_name, branch_id').eq('role', 'loan_officer').eq('is_active', true);
  if (ctx.scope.officerId !== 'all') pq = pq.eq('id', ctx.scope.officerId);
  if (ctx.scope.branchId !== 'all') pq = pq.eq('branch_id', ctx.scope.branchId);
  const { data: officers } = await pq;
  const branches = await branchMap(ctx.sb);
  const { data: loans } = await ctx.sb.from('loans').select('officer_id, customer_id, principal_amount, amount_paid, outstanding_balance, status, health');
  const { data: allocs } = await ctx.sb.from('payment_allocations').select('amount, loans!inner(officer_id)');
  const collected: Record<string, number> = {};
  for (const a of (allocs || []) as Array<{ amount: number; loans: { officer_id: string } | Array<{ officer_id: string }> }>) {
    const o = Array.isArray(a.loans) ? a.loans[0]?.officer_id : a.loans?.officer_id;
    if (o) collected[o] = (collected[o] || 0) + Number(a.amount);
  }
  const rows: ReportRow[] = ((officers || []) as Array<{ id: string; full_name: string; branch_id: string | null }>).map((o) => {
    const mine = ((loans || []) as Array<{ officer_id: string | null; customer_id: string; principal_amount: number; amount_paid: number; outstanding_balance: number; status: string; health: string }>).filter((l) => l.officer_id === o.id);
    const customers = new Set(mine.map((l) => l.customer_id)).size;
    const disbursed = mine.reduce((s, l) => s + Number(l.principal_amount), 0);
    const coll = collected[o.id] || 0;
    const active = mine.filter((l) => ['performing', 'at_risk', 'overdue'].includes(l.status)).length;
    const def = mine.filter((l) => l.health === 'defaulted').length;
    const rate = disbursed > 0 ? Math.round((coll / disbursed) * 100) : 0;
    return {
      officer: o.full_name,
      branch: o.branch_id ? branches[o.branch_id] || '—' : '—',
      customers,
      loans: mine.length,
      disbursed,
      collected: Math.round(coll * 100) / 100,
      shortfall: Math.max(Math.round((disbursed - coll) * 100) / 100, 0),
      rate,
      active,
      defaulted: def,
    };
  });
  return {
    columns: [
      { key: 'officer', label: 'Officer', kind: 'text' },
      { key: 'branch', label: 'Branch', kind: 'text' },
      { key: 'customers', label: 'Customers', kind: 'number' },
      { key: 'loans', label: 'Loans', kind: 'number' },
      { key: 'disbursed', label: 'Disbursed', kind: 'money' },
      { key: 'collected', label: 'Collected', kind: 'money' },
      { key: 'shortfall', label: 'Shortfall', kind: 'money' },
      { key: 'rate', label: 'Collection Rate %', kind: 'number' },
      { key: 'active', label: 'Active Loans', kind: 'number' },
      { key: 'defaulted', label: 'Defaulted', kind: 'number' },
    ],
    rows,
    totals: { officer: 'TOTAL', branch: '', customers: rows.reduce((s, r) => s + Number(r.customers), 0), loans: rows.reduce((s, r) => s + Number(r.loans), 0), disbursed: rows.reduce((s, r) => s + Number(r.disbursed), 0), collected: rows.reduce((s, r) => s + Number(r.collected), 0), shortfall: '', rate: '', active: rows.reduce((s, r) => s + Number(r.active), 0), defaulted: rows.reduce((s, r) => s + Number(r.defaulted), 0) },
  };
}

/** 10. Branch performance (uses v_branch_performance view). */
export async function fetchBranchPerformance(ctx: Ctx): Promise<{ columns: ReportResult['columns']; rows: ReportRow[]; totals: ReportRow }> {
  let q = ctx.sb.from('v_branch_performance').select('*');
  if (ctx.scope.branchId !== 'all') q = q.eq('branch_id', ctx.scope.branchId);
  const { data } = await q;
  type BRow = { branch_name: string; officer_count: number; active_loans: number; total_loans: number; total_disbursed: number; total_collected: number; shortfall: number; performing_count: number; overdue_count: number; defaulted_count: number };
  const rows: ReportRow[] = ((data || []) as unknown as BRow[]).map((b) => ({
    branch: b.branch_name,
    officers: b.officer_count,
    customers: '',
    loans: b.total_loans,
    disbursed: Number(b.total_disbursed),
    collected: Number(b.total_collected),
    shortfall: Number(b.shortfall),
    rate: Number(b.total_disbursed) > 0 ? Math.round((Number(b.total_collected) / Number(b.total_disbursed)) * 100) : 0,
    active: b.active_loans,
    defaulted: b.defaulted_count,
  }));
  return {
    columns: [
      { key: 'branch', label: 'Branch', kind: 'text' },
      { key: 'officers', label: 'Officers', kind: 'number' },
      { key: 'loans', label: 'Loans', kind: 'number' },
      { key: 'disbursed', label: 'Disbursed', kind: 'money' },
      { key: 'collected', label: 'Collected', kind: 'money' },
      { key: 'shortfall', label: 'Shortfall', kind: 'money' },
      { key: 'rate', label: 'Collection Rate %', kind: 'number' },
      { key: 'active', label: 'Active Loans', kind: 'number' },
      { key: 'defaulted', label: 'Defaulted', kind: 'number' },
    ],
    rows,
    totals: { branch: 'TOTAL', officers: rows.reduce((s, r) => s + Number(r.officers), 0), loans: rows.reduce((s, r) => s + Number(r.loans), 0), disbursed: rows.reduce((s, r) => s + Number(r.disbursed), 0), collected: rows.reduce((s, r) => s + Number(r.collected), 0), shortfall: rows.reduce((s, r) => s + Number(r.shortfall), 0), rate: '', active: rows.reduce((s, r) => s + Number(r.active), 0), defaulted: rows.reduce((s, r) => s + Number(r.defaulted), 0) },
  };
}
