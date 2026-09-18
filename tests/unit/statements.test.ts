import { describe, it, expect } from 'vitest';
import { summarizePl, summarizeBalanceSheet, filterLinesByBranch, type StatementLine } from '@/lib/accounting/statements';

function line(code: string, name: string, type: StatementLine['accountType'], debit: number, credit: number): StatementLine {
  return { accountCode: code, accountName: name, accountType: type, debitKwacha: debit, creditKwacha: credit };
}

describe('summarizePl', () => {
  it('totals match the sum of journal lines for a period', () => {
    const lines = [
      line('4000', 'Interest Income', 'revenue', 0, 5000),
      line('4200', 'Penalty Income', 'revenue', 0, 500),
      line('5000', 'Salaries', 'expense', 2000, 0),
      line('5100', 'Rent', 'expense', 1500, 0),
      line('1000', 'Cash', 'asset', 2000, 0),
    ];
    const s = summarizePl(lines);
    expect(s.incomeNgwee).toBe(550000);
    expect(s.expenseNgwee).toBe(350000);
    expect(s.netNgwee).toBe(200000);
    expect(s.byCategory).toHaveLength(4);
  });
  it('returns zeros for an empty period', () => {
    const s = summarizePl([]);
    expect(s).toMatchObject({ incomeNgwee: 0, expenseNgwee: 0, netNgwee: 0 });
  });
});

describe('summarizeBalanceSheet', () => {
  it('balances (A = L + E + retained) after random balanced transactions', () => {
    // deterministic PRNG for a stable test
    let seed = 42;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const lines: StatementLine[] = [];
    const accts: Array<[string, string, StatementLine['accountType']]> = [
      ['1000', 'Cash', 'asset'],
      ['1200', 'Loan Portfolio', 'asset'],
      ['2000', 'Payable', 'liability'],
      ['3000', 'Equity', 'equity'],
      ['4000', 'Income', 'revenue'],
      ['5000', 'Expense', 'expense'],
    ];
    for (let i = 0; i < 50; i++) {
      const amt = Math.floor(rand() * 10000) + 1;
      // every transaction touches two accounts, debit one / credit other
      const a = accts[Math.floor(rand() * accts.length)]!;
      let b = accts[Math.floor(rand() * accts.length)]!;
      if (b === a) b = accts[(accts.indexOf(a) + 1) % accts.length]!;
      lines.push(line(a[0], a[1], a[2], amt, 0));
      lines.push(line(b[0], b[1], b[2], 0, amt));
    }
    const bs = summarizeBalanceSheet(lines);
    expect(bs.balanced).toBe(true);
    expect(bs.assetsNgwee).toBe(bs.liabilitiesNgwee + bs.equityNgwee + bs.retainedNgwee);
  });
  it('places revenue in retained and expenses against it', () => {
    const bs = summarizeBalanceSheet([
      line('1000', 'Cash', 'asset', 3000, 0),
      line('3000', 'Equity', 'equity', 0, 2000),
      line('4000', 'Income', 'revenue', 0, 1500),
      line('5000', 'Expense', 'expense', 500, 0),
    ]);
    expect(bs.retainedNgwee).toBe(100000);
    expect(bs.balanced).toBe(true);
  });
});

describe('filterLinesByBranch', () => {
  const lines: StatementLine[] = [
    { ...{ accountCode: '4000', accountName: 'Income', accountType: 'revenue', debitKwacha: 0, creditKwacha: 1000 }, branchId: 'b1' },
    { ...{ accountCode: '4000', accountName: 'Income', accountType: 'revenue', debitKwacha: 0, creditKwacha: 2000 }, branchId: 'b2' },
    { ...{ accountCode: '5000', accountName: 'Expense', accountType: 'expense', debitKwacha: 500, creditKwacha: 0 }, branchId: null },
  ];

  it("manager P&L sees only their branch", () => {
    const filtered = filterLinesByBranch(lines, 'b1');
    const s = summarizePl(filtered);
    expect(s.incomeNgwee).toBe(100000);
    expect(s.expenseNgwee).toBe(0);
  });

  it('owner sees all branches with correct totals', () => {
    const filtered = filterLinesByBranch(lines, 'all');
    const s = summarizePl(filtered);
    expect(s.incomeNgwee).toBe(300000);
    expect(s.expenseNgwee).toBe(50000);
  });
});
