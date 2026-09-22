'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ALLOCATION_PRESETS,
  loanProductSchema,
  type LoanProductInput,
} from '@/lib/validations/loan-product';
import { createProduct, updateProduct } from './actions';

type Props = {
  initial?: Partial<LoanProductInput> & { id?: string };
};

const inputCls =
  'w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-3 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none';
const labelCls = 'mb-1 block text-xs font-medium text-text-secondary';
const sectionCls = 'glass-card space-y-4 p-4';
const sectionTitleCls = 'text-sm font-bold text-text-primary';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}

const DEFAULTS: LoanProductInput = {
  name: '',
  code: '',
  description: '',
  is_active: true,
  min_amount: 500,
  max_amount: 50000,
  interest_rate: 25,
  interest_type: 'flat',
  default_duration: 3,
  duration_unit: 'months',
  repayment_frequency: 'monthly',
  processing_fee_type: 'none',
  processing_fee_value: 0,
  penalty_rule_type: 'percent_of_overdue',
  penalty_value: 5,
  penalty_compounds: false,
  penalty_cap: undefined,
  grace_period_days: 3,
  default_after_days: 30,
  allocation_order: 'penalty,fee,interest,principal',
};

export function ProductForm({ initial }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = !!initial?.id;

  const v = { ...DEFAULTS, ...initial };
  const err = (k: string) => fieldErrors[k];

  async function onSubmit(formData: FormData) {
    setServerError(null);
    const raw: Record<string, unknown> = {};
    for (const [k, val] of formData.entries()) raw[k] = val;
    raw.is_active = formData.get('is_active') === 'on';
    raw.penalty_compounds = formData.get('penalty_compounds') === 'on';
    const parsed = loanProductSchema.safeParse(raw);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    const result = isEdit
      ? await updateProduct(initial!.id!, formData)
      : await createProduct(formData);
    setSaving(false);
    if (!result.ok) {
      setServerError(result.error ?? 'Something went wrong.');
      return;
    }
    router.push('/settings/loan-products');
    router.refresh();
  }

  return (
    <form action={onSubmit} className="space-y-4">
      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Basic</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *" error={err('name')}>
            <input name="name" required defaultValue={v.name} maxLength={100} className={inputCls} />
          </Field>
          <Field label="Code * (2–6 uppercase letters/digits)" error={err('code')}>
            <input name="code" required defaultValue={v.code} maxLength={6} className={`${inputCls} uppercase`} />
          </Field>
        </div>
        <Field label="Description" error={err('description')}>
          <textarea name="description" defaultValue={v.description ?? ''} rows={2} maxLength={500} className={inputCls} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="checkbox" name="is_active" defaultChecked={v.is_active} className="h-5 w-5 accent-[#f5b300]" />
          Active
        </label>
      </div>

      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Amount (ZMW)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Min Amount *" error={err('min_amount')}>
            <input name="min_amount" type="number" required min={100} step="0.01" defaultValue={v.min_amount} className={inputCls} />
          </Field>
          <Field label="Max Amount *" error={err('max_amount')}>
            <input name="max_amount" type="number" required min={100} step="0.01" defaultValue={v.max_amount} className={inputCls} />
          </Field>
        </div>
      </div>

      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Interest</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Interest Rate * (%, 0.5–200)" error={err('interest_rate')}>
            <input name="interest_rate" type="number" required min={0.5} max={200} step="0.01" defaultValue={v.interest_rate} className={inputCls} />
          </Field>
          <Field label="Interest Type *" error={err('interest_type')}>
            <select name="interest_type" defaultValue={v.interest_type} className={inputCls}>
              <option value="flat">Flat</option>
              <option value="reducing_balance">Reducing Balance</option>
            </select>
          </Field>
        </div>
      </div>

      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Term</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Default Duration *" error={err('default_duration')}>
            <input name="default_duration" type="number" required min={1} step={1} defaultValue={v.default_duration} className={inputCls} />
          </Field>
          <Field label="Duration Unit *" error={err('duration_unit')}>
            <select name="duration_unit" defaultValue={v.duration_unit} className={inputCls}>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </Field>
          <Field label="Repayment Frequency *" error={err('repayment_frequency')}>
            <select name="repayment_frequency" defaultValue={v.repayment_frequency} className={inputCls}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>
        </div>
      </div>

      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Fees & Penalties</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Processing Fee Type" error={err('processing_fee_type')}>
            <select name="processing_fee_type" defaultValue={v.processing_fee_type} className={inputCls}>
              <option value="none">None</option>
              <option value="fixed">Fixed</option>
              <option value="percent">Percent</option>
            </select>
          </Field>
          <Field label="Processing Fee Value" error={err('processing_fee_value')}>
            <input name="processing_fee_value" type="number" min={0} step="0.01" defaultValue={v.processing_fee_value} className={inputCls} />
          </Field>
          <Field label="Penalty Rule Type" error={err('penalty_rule_type')}>
            <select name="penalty_rule_type" defaultValue={v.penalty_rule_type} className={inputCls}>
              <option value="none">None</option>
              <option value="fixed">Fixed</option>
              <option value="percent_of_overdue">Percent of Overdue</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </Field>
          <Field label="Penalty Value" error={err('penalty_value')}>
            <input name="penalty_value" type="number" min={0} step="0.01" defaultValue={v.penalty_value} className={inputCls} />
          </Field>
          <Field label="Penalty Cap (optional)" error={err('penalty_cap')}>
            <input name="penalty_cap" type="number" min={0} step="0.01" defaultValue={v.penalty_cap ?? ''} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Grace Period Days *" error={err('grace_period_days')}>
              <input name="grace_period_days" type="number" required min={0} step={1} defaultValue={v.grace_period_days} className={inputCls} />
            </Field>
            <Field label="Default After Days *" error={err('default_after_days')}>
              <input name="default_after_days" type="number" required min={1} step={1} defaultValue={v.default_after_days} className={inputCls} />
            </Field>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="checkbox" name="penalty_compounds" defaultChecked={v.penalty_compounds} className="h-5 w-5 accent-[#f5b300]" />
          Penalty Compounds
        </label>
      </div>

      <div className={sectionCls}>
        <h2 className={sectionTitleCls}>Allocation</h2>
        <Field label="Allocation Order *" error={err('allocation_order')}>
          <select name="allocation_order" defaultValue={v.allocation_order} className={inputCls}>
            {(Object.keys(ALLOCATION_PRESETS) as Array<keyof typeof ALLOCATION_PRESETS>).map((k) => (
              <option key={k} value={k}>{ALLOCATION_PRESETS[k]}</option>
            ))}
          </select>
        </Field>
      </div>

      {serverError && <p className="text-sm text-danger">{serverError}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-[var(--radius-button)] bg-accent-primary px-6 py-3 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover disabled:opacity-50"
      >
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
      </button>
    </form>
  );
}
