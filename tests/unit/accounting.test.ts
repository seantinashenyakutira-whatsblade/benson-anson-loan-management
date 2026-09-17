import { describe, it, expect } from 'vitest';
import {
  cashAccountForMethod,
  validateBalanced,
  buildDisbursementLines,
  buildPaymentLines,
  buildPenaltyLines,
  buildExpenseLines,
  buildIncomeLines,
  cashbookRunningBalance,
} from '@/lib/accounting/posting';

describe('cashAccountForMethod', () => {
  it('maps bank_transfer to 1020', () => {
    expect(cashAccountForMethod('bank_transfer')).toBe('1020');
  });
  it('maps mobile money methods to 1030', () => {
    expect(cashAccountForMethod('airtel_money')).toBe('1030');
    expect(cashAccountForMethod('mtn_mobile_money')).toBe('1030');
  });
  it('defaults cash and unknown methods to 1000', () => {
    expect(cashAccountForMethod('cash')).toBe('1000');
    expect(cashAccountForMethod('other')).toBe('1000');
    expect(cashAccountForMethod('cheque')).toBe('1000');
  });
});

describe('validateBalanced', () => {
  it('accepts balanced entries', () => {
    const r = validateBalanced([
      { accountCode: '1200', debitNgwee: 1000000, creditNgwee: 0 },
      { accountCode: '1000', debitNgwee: 0, creditNgwee: 1000000 },
    ]);
    expect(r).toEqual({ totalDebit: 1000000, totalCredit: 1000000 });
  });
  it('rejects unbalanced entries', () => {
    expect(() =>
      validateBalanced([
        { accountCode: '1200', debitNgwee: 1000000, creditNgwee: 0 },
        { accountCode: '1000', debitNgwee: 0, creditNgwee: 999999 },
      ]),
    ).toThrow('Unbalanced');
  });
  it('rejects two-sided lines and empty lines', () => {
    expect(() =>
      validateBalanced([
        { accountCode: '1200', debitNgwee: 5, creditNgwee: 5 },
        { accountCode: '1000', debitNgwee: 0, creditNgwee: 10 },
      ]),
    ).toThrow('both debit and credit');
    expect(() =>
      validateBalanced([
        { accountCode: '1200', debitNgwee: 0, creditNgwee: 0 },
        { accountCode: '1000', debitNgwee: 0, creditNgwee: 10 },
      ]),
    ).toThrow('must have a debit or a credit');
  });
});

describe('buildDisbursementLines', () => {
  it('produces balanced Dr 1200 / Cr cash for K10,000', () => {
    const lines = buildDisbursementLines(10000, 'cash');
    expect(lines[0]).toMatchObject({ accountCode: '1200', debitNgwee: 1000000, creditNgwee: 0 });
    expect(lines[1]).toMatchObject({ accountCode: '1000', debitNgwee: 0, creditNgwee: 1000000 });
    expect(() => validateBalanced(lines)).not.toThrow();
  });
  it('uses bank account for bank_transfer', () => {
    const lines = buildDisbursementLines(5000, 'bank_transfer');
    expect(lines[1]?.accountCode).toBe('1020');
  });
});

describe('buildPaymentLines', () => {
  it('produces balanced Dr cash / Cr 1200', () => {
    const lines = buildPaymentLines(2500.5, 'mtn_mobile_money');
    expect(lines[0]).toMatchObject({ accountCode: '1030', debitNgwee: 250050, creditNgwee: 0 });
    expect(lines[1]).toMatchObject({ accountCode: '1200', debitNgwee: 0, creditNgwee: 250050 });
    expect(() => validateBalanced(lines)).not.toThrow();
  });
  it('accepts a split that sums to the total (partial payment)', () => {
    const lines = buildPaymentLines(1000, 'cash', {
      principalKwacha: 700,
      interestKwacha: 200,
      feeKwacha: 50,
      penaltyKwacha: 50,
    });
    expect(() => validateBalanced(lines)).not.toThrow();
  });
  it('rejects a split that does not sum to the total', () => {
    expect(() =>
      buildPaymentLines(1000, 'cash', { principalKwacha: 700, interestKwacha: 200, feeKwacha: 50, penaltyKwacha: 0 }),
    ).toThrow('must sum to the total');
  });
});

describe('buildPenaltyLines', () => {
  it('posts Dr 1210 / Cr 4200', () => {
    const lines = buildPenaltyLines(150.75);
    expect(lines[0]).toMatchObject({ accountCode: '1210', debitNgwee: 15075 });
    expect(lines[1]).toMatchObject({ accountCode: '4200', creditNgwee: 15075 });
    expect(() => validateBalanced(lines)).not.toThrow();
  });
});

describe('buildExpenseLines / buildIncomeLines', () => {
  it('posts expense Dr 5xxx / Cr cash', () => {
    const lines = buildExpenseLines(2000, '5100', 'cash');
    expect(lines[0]?.accountCode).toBe('5100');
    expect(() => validateBalanced(lines)).not.toThrow();
  });
  it('rejects non-expense accounts', () => {
    expect(() => buildExpenseLines(2000, '4000')).toThrow('5xxx');
  });
  it('posts income Dr cash / Cr 4xxx', () => {
    const lines = buildIncomeLines(2000, '4300', 'bank_transfer');
    expect(lines[0]?.accountCode).toBe('1020');
    expect(lines[1]?.accountCode).toBe('4300');
    expect(() => validateBalanced(lines)).not.toThrow();
  });
  it('rejects non-income accounts', () => {
    expect(() => buildIncomeLines(2000, '5000')).toThrow('4xxx');
  });
});

describe('cashbookRunningBalance', () => {
  it('folds 20 mixed transactions to the exact closing balance', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      date: `2026-09-${String(i + 1).padStart(2, '0')}`,
      description: `txn ${i + 1}`,
      ref: `R${i + 1}`,
      inNgwee: i % 2 === 0 ? (i + 1) * 10000 : 0,
      outNgwee: i % 2 === 1 ? (i + 1) * 5000 : 0,
    }));
    const result = cashbookRunningBalance(rows, 100000);
    const expected = 100000 + rows.reduce((s, r) => s + r.inNgwee - r.outNgwee, 0);
    expect(result[result.length - 1]?.balanceNgwee).toBe(expected);
    // monotonic check on a known prefix: 100000 + 10000 = 110000 after row 1
    expect(result[0]?.balanceNgwee).toBe(110000);
  });
  it('handles empty rows with opening balance only', () => {
    expect(cashbookRunningBalance([], 50000)).toEqual([]);
  });
});
