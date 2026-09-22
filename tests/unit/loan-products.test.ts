import { describe, it, expect } from 'vitest';
import {
  ALLOCATION_PRESETS,
  loanProductSchema,
  parseProductForm,
} from '@/lib/validations/loan-product';

const BASE = {
  name: 'Test Loan',
  code: 'TL',
  description: '',
  is_active: 'on',
  min_amount: '500',
  max_amount: '50000',
  interest_rate: '25',
  interest_type: 'flat',
  default_duration: '3',
  duration_unit: 'months',
  repayment_frequency: 'monthly',
  processing_fee_type: 'none',
  processing_fee_value: '0',
  penalty_rule_type: 'percent_of_overdue',
  penalty_value: '5',
  grace_period_days: '3',
  default_after_days: '30',
  allocation_order: 'penalty,fee,interest,principal',
};

function fd(overrides: Record<string, string> = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ ...BASE, ...overrides })) f.set(k, v);
  return f;
}

describe('loanProductSchema', () => {
  it('accepts a valid product', () => {
    const r = loanProductSchema.safeParse({ ...BASE, is_active: true, penalty_compounds: false });
    expect(r.success).toBe(true);
  });

  it('uppercases codes and rejects bad formats', () => {
    const lower = loanProductSchema.safeParse({ ...BASE, code: 'pl', is_active: true });
    expect(lower.success).toBe(true);
    if (lower.success) expect(lower.data.code).toBe('PL');

    for (const bad of ['P', 'TOOLONG7', 'P L', 'P-L']) {
      const r = loanProductSchema.safeParse({ ...BASE, code: bad, is_active: true });
      expect(r.success).toBe(false);
    }
  });

  it('rejects max <= min', () => {
    const r = loanProductSchema.safeParse({ ...BASE, min_amount: 50000, max_amount: 50000, is_active: true });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path[0] === 'max_amount')).toBe(true);
    }
  });

  it('enforces interest rate 0.5–200', () => {
    for (const bad of ['0.4', '201', '-5']) {
      expect(loanProductSchema.safeParse({ ...BASE, interest_rate: bad, is_active: true }).success).toBe(false);
    }
    for (const good of ['0.5', '200', '40']) {
      expect(loanProductSchema.safeParse({ ...BASE, interest_rate: good, is_active: true }).success).toBe(true);
    }
  });

  it('rejects unknown enums', () => {
    expect(
      loanProductSchema.safeParse({ ...BASE, interest_type: 'compound', is_active: true }).success,
    ).toBe(false);
    expect(
      loanProductSchema.safeParse({ ...BASE, repayment_frequency: 'yearly', is_active: true }).success,
    ).toBe(false);
  });

  it('applies defaults for grace period, default-after and allocation', () => {
    const raw = { ...BASE, is_active: true } as Record<string, unknown>;
    delete raw.grace_period_days;
    delete raw.default_after_days;
    delete raw.allocation_order;
    const r = loanProductSchema.safeParse(raw);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.grace_period_days).toBe(3);
      expect(r.data.default_after_days).toBe(30);
      expect(r.data.allocation_order).toBe('penalty,fee,interest,principal');
    }
  });

  it('treats empty penalty cap as undefined', () => {
    const r = loanProductSchema.safeParse({ ...BASE, penalty_cap: '', is_active: true });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.penalty_cap).toBeUndefined();
  });
});

describe('parseProductForm', () => {
  it('parses FormData with checkbox semantics', () => {
    const p = parseProductForm(fd());
    expect(p.code).toBe('TL');
    expect(p.is_active).toBe(true);
    expect(p.penalty_compounds).toBe(false);
    expect(p.min_amount).toBe(500);
  });

  it('throws on invalid input', () => {
    expect(() => parseProductForm(fd({ max_amount: '100' }))).toThrow();
  });
});

describe('ALLOCATION_PRESETS', () => {
  it('covers the four required orders with the default first', () => {
    const keys = Object.keys(ALLOCATION_PRESETS);
    expect(keys).toEqual(['penalty,fee,interest,principal', 'fee,interest,principal', 'interest,principal', 'principal']);
    expect(ALLOCATION_PRESETS['penalty,fee,interest,principal']).toContain('Penalty');
  });
});
