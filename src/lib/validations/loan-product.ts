import { z } from 'zod';

/** DB allocation_order values mapped to UI labels. */
export const ALLOCATION_PRESETS = {
  'penalty,fee,interest,principal': 'Penalty → Fee → Interest → Principal',
  'fee,interest,principal': 'Fee → Interest → Principal',
  'interest,principal': 'Interest → Principal',
  principal: 'Principal Only',
} as const;

export type AllocationOrder = keyof typeof ALLOCATION_PRESETS;

const optionalMoney = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : v),
  z.coerce.number().min(0, 'Must be 0 or more').optional(),
);

export const loanProductSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, 'Code must be 2–6 characters')
      .max(6, 'Code must be 2–6 characters')
      .regex(/^[A-Z0-9]+$/, 'Code must be uppercase letters and digits only'),
    description: z.string().trim().max(500).optional().or(z.literal('')),
    is_active: z.boolean().default(true),
    min_amount: z.coerce.number().min(100, 'Min amount must be at least K100'),
    max_amount: z.coerce.number().min(100, 'Max amount must be at least K100'),
    interest_rate: z.coerce.number().min(0.5, 'Rate must be at least 0.5%').max(200, 'Rate cannot exceed 200%'),
    interest_type: z.enum(['flat', 'reducing_balance']),
    default_duration: z.coerce.number().int().min(1, 'Duration must be at least 1'),
    duration_unit: z.enum(['days', 'weeks', 'months']),
    repayment_frequency: z.enum(['daily', 'weekly', 'monthly']),
    processing_fee_type: z.enum(['none', 'fixed', 'percent']),
    processing_fee_value: z.coerce.number().min(0).default(0),
    penalty_rule_type: z.enum(['none', 'fixed', 'percent_of_overdue', 'daily', 'weekly']),
    penalty_value: z.coerce.number().min(0).default(0),
    penalty_compounds: z.boolean().default(false),
    penalty_cap: optionalMoney,
    grace_period_days: z.coerce.number().int().min(0).default(3),
    default_after_days: z.coerce.number().int().min(1).default(30),
    allocation_order: z
      .enum(['penalty,fee,interest,principal', 'fee,interest,principal', 'interest,principal', 'principal'])
      .default('penalty,fee,interest,principal'),
  })
  .refine((d) => d.max_amount > d.min_amount, {
    message: 'Max amount must be greater than min amount',
    path: ['max_amount'],
  });

export type LoanProductInput = z.infer<typeof loanProductSchema>;

/** Parse FormData from the product form into validated input. */
export function parseProductForm(formData: FormData): LoanProductInput {
  const raw: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) raw[k] = v;
  raw.is_active = formData.get('is_active') === 'on';
  raw.penalty_compounds = formData.get('penalty_compounds') === 'on';
  return loanProductSchema.parse(raw);
}
