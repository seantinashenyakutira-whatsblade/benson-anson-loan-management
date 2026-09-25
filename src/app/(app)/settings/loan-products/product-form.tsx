'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ALLOCATION_PRESETS,
  loanProductSchema,
  type LoanProductInput,
} from '@/lib/validations/loan-product';
import { createProduct, updateProduct } from './actions';
import { Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';

type Props = {
  initial?: Partial<LoanProductInput> & { id?: string };
};

const sectionTitleCls = 'text-sm font-bold text-text-primary';

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
      <Surface className="space-y-4 p-4">
        <h2 className={sectionTitleCls}>Basic</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name *" name="name" required defaultValue={v.name} maxLength={100} error={err('name')} />
          <Input label="Code * (2–6 uppercase letters/digits)" name="code" required defaultValue={v.code} maxLength={6} className="uppercase" error={err('code')} />
        </div>
        <Textarea label="Description" name="description" defaultValue={v.description ?? ''} rows={2} maxLength={500} error={err('description')} />
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="checkbox" name="is_active" defaultChecked={v.is_active} className="h-5 w-5 accent-accent-primary" />
          Active
        </label>
      </Surface>

      <Surface className="space-y-4 p-4">
        <h2 className={sectionTitleCls}>Amount (ZMW)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Min Amount *" name="min_amount" type="number" required min={100} step="0.01" defaultValue={v.min_amount} error={err('min_amount')} />
          <Input label="Max Amount *" name="max_amount" type="number" required min={100} step="0.01" defaultValue={v.max_amount} error={err('max_amount')} />
        </div>
      </Surface>

      <Surface className="space-y-4 p-4">
        <h2 className={sectionTitleCls}>Interest</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Interest Rate * (%, 0.5–200)" name="interest_rate" type="number" required min={0.5} max={200} step="0.01" defaultValue={v.interest_rate} error={err('interest_rate')} />
          <Select label="Interest Type *" name="interest_type" defaultValue={v.interest_type} error={err('interest_type')}>
            <option value="flat">Flat</option>
            <option value="reducing_balance">Reducing Balance</option>
          </Select>
        </div>
      </Surface>

      <Surface className="space-y-4 p-4">
        <h2 className={sectionTitleCls}>Term</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Default Duration *" name="default_duration" type="number" required min={1} step={1} defaultValue={v.default_duration} error={err('default_duration')} />
          <Select label="Duration Unit *" name="duration_unit" defaultValue={v.duration_unit} error={err('duration_unit')}>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
            <option value="months">Months</option>
          </Select>
          <Select label="Repayment Frequency *" name="repayment_frequency" defaultValue={v.repayment_frequency} error={err('repayment_frequency')}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </div>
      </Surface>

      <Surface className="space-y-4 p-4">
        <h2 className={sectionTitleCls}>Fees & Penalties</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Processing Fee Type" name="processing_fee_type" defaultValue={v.processing_fee_type} error={err('processing_fee_type')}>
            <option value="none">None</option>
            <option value="fixed">Fixed</option>
            <option value="percent">Percent</option>
          </Select>
          <Input label="Processing Fee Value" name="processing_fee_value" type="number" min={0} step="0.01" defaultValue={v.processing_fee_value} error={err('processing_fee_value')} />
          <Select label="Penalty Rule Type" name="penalty_rule_type" defaultValue={v.penalty_rule_type} error={err('penalty_rule_type')}>
            <option value="none">None</option>
            <option value="fixed">Fixed</option>
            <option value="percent_of_overdue">Percent of Overdue</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </Select>
          <Input label="Penalty Value" name="penalty_value" type="number" min={0} step="0.01" defaultValue={v.penalty_value} error={err('penalty_value')} />
          <Input label="Penalty Cap (optional)" name="penalty_cap" type="number" min={0} step="0.01" defaultValue={v.penalty_cap ?? ''} error={err('penalty_cap')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Grace Period Days *" name="grace_period_days" type="number" required min={0} step={1} defaultValue={v.grace_period_days} error={err('grace_period_days')} />
            <Input label="Default After Days *" name="default_after_days" type="number" required min={1} step={1} defaultValue={v.default_after_days} error={err('default_after_days')} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input type="checkbox" name="penalty_compounds" defaultChecked={v.penalty_compounds} className="h-5 w-5 accent-accent-primary" />
          Penalty Compounds
        </label>
      </Surface>

      <Surface className="space-y-4 p-4">
        <h2 className={sectionTitleCls}>Allocation</h2>
        <Select label="Allocation Order *" name="allocation_order" defaultValue={v.allocation_order} error={err('allocation_order')}>
          {(Object.keys(ALLOCATION_PRESETS) as Array<keyof typeof ALLOCATION_PRESETS>).map((k) => (
            <option key={k} value={k}>{ALLOCATION_PRESETS[k]}</option>
          ))}
        </Select>
      </Surface>

      {serverError && <p className="text-sm text-danger">{serverError}</p>}

      <Button
        type="submit"
        variant="primary"
        disabled={saving}
        className="w-full"
      >
        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
      </Button>
    </form>
  );
}
