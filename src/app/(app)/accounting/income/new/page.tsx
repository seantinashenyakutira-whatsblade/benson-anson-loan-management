'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { ArrowLeft } from 'lucide-react';
import { INCOME_CATEGORIES, loadAccountMaps, DEFAULT_INCOME_ACCOUNT_MAP } from '@/lib/accounting/accounts';
import { cashAccountForMethod } from '@/lib/accounting/posting';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'airtel_money', label: 'Airtel Money' },
  { value: 'mtn_mobile_money', label: 'MTN MoMo' },
];

export default function NewIncomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [accountMap, setAccountMap] = useState<Record<string, string>>(DEFAULT_INCOME_ACCOUNT_MAP);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('branches').select('id, name').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setBranches(data);
    });
    loadAccountMaps(supabase).then((m) => setAccountMap(m.incomeMap));
  }, [supabase]);

  const handleSubmit = async (formData: FormData) => {
    if (!user) return;
    setSaving(true);
    const amount = Number(formData.get('amount'));
    const category = formData.get('category') as string;
    const method = formData.get('method') as string;
    const incomeAccount = accountMap[category] || DEFAULT_INCOME_ACCOUNT_MAP.other!;
    const cashAccount = cashAccountForMethod(method);

    const { data: record, error: rowError } = await supabase
      .from('income_records')
      .insert({
        category,
        description: formData.get('description') as string,
        amount,
        income_date: formData.get('income_date') as string,
        branch_id: (formData.get('branch_id') as string) || null,
        recorded_by: user.id,
      })
      .select()
      .single();

    if (rowError || !record) {
      setSaving(false);
      alert('Error: ' + rowError?.message);
      return;
    }

    const { error: journalError } = await supabase.rpc('rpc_post_journal', {
      p_entry_date: formData.get('income_date') as string,
      p_description: `Income: ${record.description} — K${amount}`,
      p_reference_type: 'income',
      p_reference_id: record.id,
      p_created_by: user.id,
      p_lines: [
        { account_code: cashAccount, debit: amount, credit: 0, description: 'Cash in' },
        { account_code: incomeAccount, debit: 0, credit: amount, description: record.description },
      ],
    });

    if (journalError) {
      await supabase.from('income_records').delete().eq('id', record.id);
      setSaving(false);
      alert('Error posting journal (income rolled back): ' + journalError.message);
      return;
    }

    setSaving(false);
    router.push('/accounting/income');
  };

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card p-6">
        <h1 className="mb-6 text-2xl font-bold text-text-primary">Record Income</h1>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Date *</label>
              <input name="income_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Category *</label>
              <select name="category" required className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
                {INCOME_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace('_', ' ')} → {accountMap[c]}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Description *</label>
            <input name="description" required placeholder="Processing fees collected" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Amount (K) *</label>
              <input name="amount" type="number" step="0.01" required min="0.01" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Received Via *</label>
              <select name="method" required className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
                {METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Branch</label>
              <select name="branch_id" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
                <option value="">Head Office (default)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-[var(--radius-button)] bg-accent-primary px-4 py-3 font-medium text-accent-on-primary hover:bg-accent-primary-hover disabled:opacity-50"
          >
            {saving ? 'Posting...' : 'Post Income'}
          </button>
        </form>
      </div>
    </div>
  );
}
