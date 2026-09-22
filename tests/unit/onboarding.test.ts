import { describe, it, expect } from 'vitest';
import {
  STEP_COUNT,
  phoneSchema,
  progressPercent,
  repaymentEstimate,
  step1Schema,
  step2Schema,
  step5Schema,
  step7Schema,
  tenureLabel,
} from '@/lib/validations/onboarding';

const ADULT = '1990-01-01';
const MINOR = '2015-01-01';

function step1(overrides: Record<string, unknown> = {}) {
  return {
    full_name: 'Mutinta Phiri',
    date_of_birth: ADULT,
    national_id_type: 'NRC',
    nrc_or_passport: '123456/78/9',
    phone: '+260977123456',
    address: 'Plot 12, Kabulonga, Lusaka',
    residence_type: 'Rented',
    nationality: 'Zambian',
    next_of_kin_name: 'Chanda Phiri',
    next_of_kin_phone: '0955123456',
    ...overrides,
  };
}

describe('onboarding step 1', () => {
  it('accepts a valid NRC application', () => {
    expect(step1Schema.safeParse(step1()).success).toBe(true);
  });

  it('validates ID numbers per type', () => {
    expect(step1Schema.safeParse(step1({ national_id_type: 'NRC', nrc_or_passport: '12345/78/9' })).success).toBe(false);
    expect(step1Schema.safeParse(step1({ national_id_type: 'Passport', nrc_or_passport: 'ZM123456' })).success).toBe(true);
    expect(step1Schema.safeParse(step1({ national_id_type: 'Passport', nrc_or_passport: 'AB123' })).success).toBe(false);
    expect(step1Schema.safeParse(step1({ national_id_type: "Driver's", nrc_or_passport: 'ZM-DL-1234567' })).success).toBe(true);
    expect(step1Schema.safeParse(step1({ national_id_type: 'TPIN', nrc_or_passport: '1234567890' })).success).toBe(true);
    expect(step1Schema.safeParse(step1({ national_id_type: 'TPIN', nrc_or_passport: '123' })).success).toBe(false);
  });

  it('rejects under-18 applicants', () => {
    const r = step1Schema.safeParse(step1({ date_of_birth: MINOR }));
    expect(r.success).toBe(false);
  });

  it('rejects bad phone formats', () => {
    expect(phoneSchema.safeParse('+260977123456').success).toBe(true);
    expect(phoneSchema.safeParse('0977123456').success).toBe(true);
    expect(phoneSchema.safeParse('260977123456').success).toBe(false);
    expect(phoneSchema.safeParse('123').success).toBe(false);
    expect(step1Schema.safeParse(step1({ phone: 'oops' })).success).toBe(false);
  });

  it('requires short address to fail and kin phone to validate', () => {
    expect(step1Schema.safeParse(step1({ address: 'Lusaka' })).success).toBe(false);
    expect(step1Schema.safeParse(step1({ next_of_kin_phone: '123' })).success).toBe(false);
  });
});

describe('onboarding employment + loan steps', () => {
  it('requires employer when employed, not when self-employed', () => {
    const base = { occupation: 'Teacher', employment_duration_months: 12, monthly_income: 5000 };
    expect(step2Schema.safeParse(base).success).toBe(false);
    expect(step2Schema.safeParse({ ...base, employer_name: 'Munali School' }).success).toBe(true);
    expect(step2Schema.safeParse({ ...base, occupation: 'Self-employed trader' }).success).toBe(true);
  });

  it('enforces money minimums and consent', () => {
    expect(step2Schema.safeParse({ occupation: 'Trader', employment_duration_months: 6, monthly_income: 499 }).success).toBe(false);
    expect(
      step5Schema.safeParse({ loan_amount_requested: 100, loan_purpose: 'x'.repeat(25), preferred_tenure: 't', repayment_source: 'Salary' }).success,
    ).toBe(false);
    expect(step7Schema.safeParse({ consent_credit_check: true, consent_accuracy: true, consent_terms: false }).success).toBe(false);
    expect(step7Schema.safeParse({ consent_credit_check: true, consent_accuracy: true, consent_terms: true }).success).toBe(true);
  });
});

describe('onboarding helpers', () => {
  it('has 7 steps and monotonic progress', () => {
    expect(STEP_COUNT).toBe(7);
    expect(progressPercent(1)).toBeLessThan(progressPercent(4));
    expect(progressPercent(7)).toBe(100);
  });

  it('labels tenures and estimates repayments', () => {
    const p = { id: 'x', name: 'Monthly Plus', interest_rate: 30, interest_type: 'flat', min_amount: 5000, max_amount: 50000, default_duration: 6, duration_unit: 'months', repayment_frequency: 'monthly' };
    expect(tenureLabel(p)).toBe('6 months @ 30%');
    const e = repaymentEstimate(10000, 30, 6, 'months', 'monthly');
    expect(e.total).toBe(13000);
    expect(e.periods).toBe(6);
    expect(e.perPeriod).toBeCloseTo(2166.67, 1);
  });
});
