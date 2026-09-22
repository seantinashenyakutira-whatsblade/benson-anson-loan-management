import { z } from 'zod';

/** Zambian phone: +260XXXXXXXXX or 09XXXXXXXX. */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+260\d{9}|0\d{9})$/, 'Enter a valid Zambian number (+260XXXXXXXXX or 09XXXXXXXX)');

export const optionalPhone = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  phoneSchema.optional(),
);

export const moneyMin500 = z.coerce
  .number()
  .min(500, 'Amount must be at least K500');

const adultDob = z
  .string()
  .min(1, 'Date of birth is required')
  .refine((s) => !Number.isNaN(Date.parse(s)), 'Enter a valid date')
  .refine((s) => {
    const dob = new Date(s);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    return dob <= cutoff;
  }, 'You must be at least 18 years old');

export const ID_TYPES = ['NRC', 'Passport', "Driver's", 'TPIN'] as const;

function idNumberFor(type: string) {
  switch (type) {
    case 'NRC':
      return z.string().trim().regex(/^\d{6}\/\d{2}\/\d$/, 'NRC format: 123456/78/9');
    case 'Passport':
      return z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^ZM\d{6}$/, 'Passport format: ZM followed by 6 digits');
    case "Driver's":
      return z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^ZM-DL-\d{7}$/, "Driver's format: ZM-DL-XXXXXXX");
    case 'TPIN':
      return z.string().trim().regex(/^\d{10}$/, 'TPIN must be 10 digits');
    default:
      return z.string().trim().min(3, 'ID number is required');
  }
}

export const step1Schema = z
  .object({
    full_name: z.string().trim().min(2).max(100),
    date_of_birth: adultDob,
    national_id_type: z.enum(ID_TYPES),
    nrc_or_passport: z.string().trim().min(1, 'ID number is required'),
    phone: phoneSchema,
    alt_phone: optionalPhone,
    email: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : v),
      z.string().trim().email('Enter a valid email').optional(),
    ),
    address: z.string().trim().min(10, 'Address must be at least 10 characters').max(300),
    residence_type: z.enum(['Owned', 'Rented', 'Family', 'Other']),
    marital_status: z.enum(['Single', 'Married', 'Divorced', 'Widowed']).optional().or(z.literal('')),
    nationality: z.string().trim().min(2).max(60).default('Zambian'),
    next_of_kin_name: z.string().trim().min(2, 'Next of kin name is required'),
    next_of_kin_phone: phoneSchema,
    next_of_kin_relationship: z.enum(['Spouse', 'Parent', 'Sibling', 'Child', 'Friend']).optional().or(z.literal('')),
  })
  .superRefine((d, ctx) => {
    const check = idNumberFor(d.national_id_type).safeParse(d.nrc_or_passport);
    if (!check.success) {
      for (const issue of check.error.issues) {
        ctx.addIssue({ ...issue, path: ['nrc_or_passport'] });
      }
    }
  });

const SELF_EMPLOYED = /self|own business|freelance|freelancer/i;

export const step2Schema = z
  .object({
    occupation: z.string().trim().min(2, 'Occupation is required'),
    employer_name: z.string().trim().optional().or(z.literal('')),
    employer_address: z.string().trim().optional().or(z.literal('')),
    job_title: z.string().trim().optional().or(z.literal('')),
    employment_duration_months: z.coerce.number().int().min(0).max(600),
    monthly_income: moneyMin500,
    other_income: z.string().trim().optional().or(z.literal('')),
  })
  .superRefine((d, ctx) => {
    if (!SELF_EMPLOYED.test(d.occupation) && !d.employer_name?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['employer_name'], message: 'Employer name is required if employed' });
    }
  });

export const step3Schema = z.object({
  existing_loans: z.string().trim().optional().or(z.literal('')),
  assets_description: z.string().trim().optional().or(z.literal('')),
});

export const COLLATERAL_TYPES = [
  'Vehicle',
  'Property',
  'Electronics',
  'Appliances',
  'Business Equipment',
  'Other',
] as const;

export const step4Schema = z.object({
  collateral_type: z.enum(COLLATERAL_TYPES),
  collateral_description: z.string().trim().min(20, 'Describe the item (20–500 characters)').max(500),
  collateral_estimated_value: moneyMin500,
  collateral_ownership: z.string().trim().min(10, 'Explain ownership (who bought it, when, papers held)'),
  collateral_location: z.string().trim().optional().or(z.literal('')),
  collateral_serial: z.string().trim().optional().or(z.literal('')),
});

export const step5Schema = z.object({
  loan_amount_requested: moneyMin500,
  loan_purpose: z.string().trim().min(20, 'Purpose must be 20–300 characters').max(300),
  preferred_tenure: z.string().min(1, 'Choose a repayment tenure'),
  repayment_source: z.string().trim().min(2, 'Repayment source is required'),
});

export const step7Schema = z.object({
  consent_credit_check: z.literal(true, { message: 'Credit-check consent is required' }),
  consent_accuracy: z.literal(true, { message: 'You must declare the information is accurate' }),
  consent_terms: z.literal(true, { message: 'You must agree to the Terms and Conditions' }),
});

export const STEP_COUNT = 7;

export function progressPercent(step: number): number {
  return Math.round((step / STEP_COUNT) * 100);
}

export interface OnboardProduct {
  id: string;
  name: string;
  interest_rate: number;
  interest_type: string;
  min_amount: number;
  max_amount: number;
  default_duration: number;
  duration_unit: string;
  repayment_frequency: string;
}

export function tenureLabel(p: OnboardProduct): string {
  const unit = p.default_duration === 1 ? p.duration_unit.replace(/s$/, '') : p.duration_unit;
  return `${p.default_duration} ${unit} @ ${Number(p.interest_rate)}%`;
}

/** Estimate total repayable + per-period payment (flat-interest estimate). */
export function repaymentEstimate(principal: number, ratePct: number, duration: number, unit: string, frequency: string): { total: number; periods: number; perPeriod: number } {
  const total = principal * (1 + ratePct / 100);
  const toDays = (n: number, u: string) =>
    u === 'days' ? n : u === 'weeks' ? n * 7 : n * 30;
  const days = Math.max(1, toDays(duration, unit));
  const periodDays = frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : 30;
  const periods = Math.max(1, Math.round(days / periodDays));
  return { total: Math.round(total * 100) / 100, periods, perPeriod: Math.round((total / periods) * 100) / 100 };
}
