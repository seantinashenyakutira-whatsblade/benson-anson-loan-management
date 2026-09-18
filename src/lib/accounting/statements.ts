/**
 * statements.ts — P&L and balance-sheet summarizers (Phase 9.3).
 * Pure functions over journal lines; ngwee arithmetic via money.ts.
 * Mirrors migration 018 view logic for client-side date ranges.
 */
import { toNgwee } from '@/lib/money';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface StatementLine {
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debitKwacha: number;
  creditKwacha: number;
  branchId?: string | null;
}

/** Client-side branch filter (queries already scope server-side; this is defense in depth). */
export function filterLinesByBranch(lines: StatementLine[], branchId: string): StatementLine[] {
  if (branchId === 'all') return lines;
  return lines.filter((l) => l.branchId === branchId);
}

export interface CategoryTotal {
  accountCode: string;
  accountName: string;
  type: AccountType;
  totalNgwee: number;
}

/** Signed total for one line: revenue/liability/equity = credit-debit, else debit-credit. */
export function signedNgwee(l: StatementLine): number {
  const d = toNgwee(l.debitKwacha);
  const c = toNgwee(l.creditKwacha);
  return l.accountType === 'revenue' || l.accountType === 'liability' || l.accountType === 'equity' ? c - d : d - c;
}

export interface PlSummary {
  incomeNgwee: number;
  expenseNgwee: number;
  netNgwee: number;
  byCategory: CategoryTotal[];
}

/** Summarize P&L for a set of lines (already date-filtered by caller). */
export function summarizePl(lines: StatementLine[]): PlSummary {
  const byCat = new Map<string, CategoryTotal>();
  let incomeNgwee = 0;
  let expenseNgwee = 0;
  for (const l of lines) {
    if (l.accountType !== 'revenue' && l.accountType !== 'expense') continue;
    const signed = signedNgwee(l);
    if (l.accountType === 'revenue') incomeNgwee += signed;
    else expenseNgwee += signed;
    const key = l.accountCode;
    const prev = byCat.get(key);
    if (prev) prev.totalNgwee += signed;
    else byCat.set(key, { accountCode: l.accountCode, accountName: l.accountName, type: l.accountType, totalNgwee: signed });
  }
  return {
    incomeNgwee,
    expenseNgwee,
    netNgwee: incomeNgwee - expenseNgwee,
    byCategory: [...byCat.values()].sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
  };
}

export interface BalanceSheet {
  assetsNgwee: number;
  liabilitiesNgwee: number;
  equityNgwee: number;
  retainedNgwee: number;
  balanced: boolean;
  byAccount: CategoryTotal[];
}

/** Balance sheet as-at a set of lines. Retained earnings = revenue - expense. */
export function summarizeBalanceSheet(lines: StatementLine[]): BalanceSheet {
  const byAcct = new Map<string, CategoryTotal>();
  let assetsNgwee = 0;
  let liabilitiesNgwee = 0;
  let equityNgwee = 0;
  let retainedNgwee = 0;
  for (const l of lines) {
    const signed = signedNgwee(l);
    if (l.accountType === 'asset') assetsNgwee += signed;
    else if (l.accountType === 'liability') liabilitiesNgwee += signed;
    else if (l.accountType === 'equity') equityNgwee += signed;
    else if (l.accountType === 'revenue') retainedNgwee += signed;
    else if (l.accountType === 'expense') retainedNgwee -= signed;
    if (l.accountType === 'asset' || l.accountType === 'liability' || l.accountType === 'equity') {
      const prev = byAcct.get(l.accountCode);
      if (prev) prev.totalNgwee += signed;
      else byAcct.set(l.accountCode, { accountCode: l.accountCode, accountName: l.accountName, type: l.accountType, totalNgwee: signed });
    }
  }
  return {
    assetsNgwee,
    liabilitiesNgwee,
    equityNgwee,
    retainedNgwee,
    balanced: assetsNgwee === liabilitiesNgwee + equityNgwee + retainedNgwee,
    byAccount: [...byAcct.values()].sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
  };
}
