/**
 * posting.ts — Pure double-entry posting builders (Phase 9.1).
 * All amounts are Kwacha floats in, ngwee integers for arithmetic.
 * Mirrors the rules in migration 016 (rpc_post_journal + auto-posting).
 */
import { toNgwee } from '@/lib/money';

export interface JournalLineInput {
  accountCode: string;
  debitNgwee: number;
  creditNgwee: number;
  description?: string;
}

export type CashMethod = 'cash' | 'bank_transfer' | 'airtel_money' | 'mtn_mobile_money' | 'other' | string;

/** Map a payment/disbursement method to its cash CoA code. Mirrors rpc_cash_account_for_method. */
export function cashAccountForMethod(method: string): string {
  switch ((method || 'cash').toLowerCase()) {
    case 'bank_transfer':
      return '1020';
    case 'airtel_money':
    case 'mtn_mobile_money':
      return '1030';
    default:
      return '1000';
  }
}

/** Validate that lines balance (debits = credits > 0) and each line is one-sided. */
export function validateBalanced(lines: JournalLineInput[]): { totalDebit: number; totalCredit: number } {
  if (lines.length < 2) throw new Error('Journal entry requires at least two lines');
  let totalDebit = 0;
  let totalCredit = 0;
  for (const l of lines) {
    if (l.debitNgwee < 0 || l.creditNgwee < 0) throw new Error('Journal line amounts cannot be negative');
    if (l.debitNgwee > 0 && l.creditNgwee > 0) throw new Error('A journal line cannot have both debit and credit');
    if (l.debitNgwee === 0 && l.creditNgwee === 0) throw new Error('A journal line must have a debit or a credit');
    totalDebit += l.debitNgwee;
    totalCredit += l.creditNgwee;
  }
  if (totalDebit <= 0 || totalDebit !== totalCredit) throw new Error('Unbalanced journal');
  return { totalDebit, totalCredit };
}

/** Disbursement: Dr 1200 Loan Portfolio (principal) / Cr cash (principal). */
export function buildDisbursementLines(principalKwacha: number, method: CashMethod): JournalLineInput[] {
  const n = toNgwee(principalKwacha);
  if (n <= 0) throw new Error('Disbursement amount must be positive');
  return [
    { accountCode: '1200', debitNgwee: n, creditNgwee: 0, description: 'Loan principal receivable' },
    { accountCode: cashAccountForMethod(method), debitNgwee: 0, creditNgwee: n, description: 'Cash out' },
  ];
}

export interface PaymentSplit {
  principalKwacha: number;
  interestKwacha: number;
  feeKwacha: number;
  penaltyKwacha: number;
}

/**
 * Payment received. The ledger allocates to principal only (see rpc_record_payment),
 * so the full amount credits Loans Receivable. Split is accepted for forward
 * compatibility and validated to sum to the total.
 */
export function buildPaymentLines(totalKwacha: number, method: CashMethod, split?: PaymentSplit): JournalLineInput[] {
  const n = toNgwee(totalKwacha);
  if (n <= 0) throw new Error('Payment amount must be positive');
  if (split) {
    const parts = toNgwee(split.principalKwacha) + toNgwee(split.interestKwacha) + toNgwee(split.feeKwacha) + toNgwee(split.penaltyKwacha);
    if (parts !== n) throw new Error('Payment split must sum to the total');
  }
  return [
    { accountCode: cashAccountForMethod(method), debitNgwee: n, creditNgwee: 0, description: 'Cash in' },
    { accountCode: '1200', debitNgwee: 0, creditNgwee: n, description: 'Loan principal recovered' },
  ];
}

/** Penalty accrual (no cash): Dr 1210 Accrued Interest / Cr 4200 Penalty Income. */
export function buildPenaltyLines(amountKwacha: number): JournalLineInput[] {
  const n = toNgwee(amountKwacha);
  if (n <= 0) throw new Error('Penalty amount must be positive');
  return [
    { accountCode: '1210', debitNgwee: n, creditNgwee: 0, description: 'Penalty receivable' },
    { accountCode: '4200', debitNgwee: 0, creditNgwee: n, description: 'Penalty income' },
  ];
}

/** Expense: Dr 5xxx expense account / Cr cash. */
export function buildExpenseLines(amountKwacha: number, expenseAccountCode: string, method: CashMethod = 'cash'): JournalLineInput[] {
  const n = toNgwee(amountKwacha);
  if (n <= 0) throw new Error('Expense amount must be positive');
  if (!/^5\d{3}$/.test(expenseAccountCode)) throw new Error('Expense account must be a 5xxx code');
  return [
    { accountCode: expenseAccountCode, debitNgwee: n, creditNgwee: 0, description: 'Expense' },
    { accountCode: cashAccountForMethod(method), debitNgwee: 0, creditNgwee: n, description: 'Cash out' },
  ];
}

/** Manual income: Dr cash / Cr 4xxx income account. */
export function buildIncomeLines(amountKwacha: number, incomeAccountCode: string, method: CashMethod = 'cash'): JournalLineInput[] {
  const n = toNgwee(amountKwacha);
  if (n <= 0) throw new Error('Income amount must be positive');
  if (!/^4\d{3}$/.test(incomeAccountCode)) throw new Error('Income account must be a 4xxx code');
  return [
    { accountCode: cashAccountForMethod(method), debitNgwee: n, creditNgwee: 0, description: 'Cash in' },
    { accountCode: incomeAccountCode, debitNgwee: 0, creditNgwee: n, description: 'Income' },
  ];
}

export interface CashbookRow {
  date: string;
  description: string;
  ref: string;
  inNgwee: number;
  outNgwee: number;
}

/**
 * Fold ordered cashbook rows into a running balance (ngwee).
 * For cash (asset) accounts: debits are money in, credits are money out.
 */
export function cashbookRunningBalance(rows: CashbookRow[], openingNgwee = 0): Array<CashbookRow & { balanceNgwee: number }> {
  let balance = openingNgwee;
  return rows.map((r) => {
    balance = balance + r.inNgwee - r.outNgwee;
    return { ...r, balanceNgwee: balance };
  });
}
