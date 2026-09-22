'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { AccessDenied } from '@/components/layout/access-denied';
import { EmptyState } from '@/components/ui/empty-state';
import { formatKwacha } from '@/lib/money';
import { ALLOCATION_PRESETS } from '@/lib/validations/loan-product';
import { setProductActive, deleteProduct } from './actions';

export interface LoanProduct {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  min_amount: number;
  max_amount: number;
  interest_rate: number;
  interest_type: string;
  default_duration: number;
  duration_unit: string;
  repayment_frequency: string;
  processing_fee_type: string;
  processing_fee_value: number;
  penalty_rule_type: string;
  penalty_value: number;
  penalty_compounds: boolean;
  penalty_cap: number | null;
  grace_period_days: number;
  default_after_days: number;
  allocation_order: string;
}

const freqLabel: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

export default function LoanProductsPage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewId, setViewId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const supabase = createClient();

  const role = profile?.role;
  const isOwner = role === 'owner';
  const canView = role === 'owner' || role === 'branch_manager';

  useEffect(() => {
    supabase
      .from('loan_products')
      .select('*')
      .order('name')
      .then(({ data }) => {
        if (data) setProducts(data as LoanProduct[]);
        setLoading(false);
      });
  }, [supabase]);

  if (authLoading || loading) {
    return <div className="py-12 text-center text-text-muted">Loading...</div>;
  }

  if (profile && !canView) {
    return <AccessDenied role={role} />;
  }

  const shown = products.filter((p) =>
    filter === 'all' ? true : filter === 'active' ? p.is_active : !p.is_active,
  );
  const viewing = products.find((p) => p.id === viewId) ?? null;

  async function onToggle(p: LoanProduct) {
    setActionError(null);
    const res = await setProductActive(p.id, !p.is_active);
    if (!res.ok) {
      setActionError(res.error ?? 'Failed to update.');
      return;
    }
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)));
    router.refresh();
  }

  async function onDelete(p: LoanProduct) {
    setActionError(null);
    if (!window.confirm(`Delete product "${p.name}"? This cannot be undone.`)) return;
    const res = await deleteProduct(p.id);
    if (!res.ok) {
      setActionError(res.error ?? 'Failed to delete.');
      return;
    }
    setProducts((list) => list.filter((x) => x.id !== p.id));
    setViewId(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Loan Products</h1>
          <p className="text-sm text-text-secondary">Products available for applications and the landing page</p>
        </div>
        {isOwner && (
          <Link
            href="/settings/loan-products/new"
            className="flex items-center gap-1 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2.5 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
          >
            <Plus size={16} /> New Product
          </Link>
        )}
      </div>

      <div className="flex gap-2">
        {(['all', 'active', 'inactive'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-[var(--radius-button)] px-3 py-2 text-sm capitalize ${
              filter === f
                ? 'bg-accent-primary font-medium text-accent-on-primary'
                : 'border border-border-subtle text-text-secondary hover:bg-surface-glass'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {actionError && <p className="text-sm text-danger">{actionError}</p>}

      {shown.length === 0 ? (
        <EmptyState icon={Package} headline="No loan products" message="Create a product to offer it on applications and the landing page." />
      ) : (
        <div className="glass-card overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-text-muted">
                <th className="pb-2 font-medium">Name</th>
                <th className="pb-2 font-medium">Code</th>
                <th className="pb-2 text-right font-medium tabular-nums">Rate</th>
                <th className="pb-2 text-right font-medium tabular-nums">Amount Range</th>
                <th className="pb-2 font-medium">Duration</th>
                <th className="pb-2 font-medium">Frequency</th>
                <th className="pb-2 font-medium">Active</th>
                {isOwner && <th className="pb-2 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id} className="border-b border-border-subtle/50">
                  <td className="py-2">
                    <button onClick={() => setViewId(p.id)} className="font-medium text-accent-primary hover:underline">
                      {p.name}
                    </button>
                  </td>
                  <td className="py-2 font-mono text-xs text-text-secondary">{p.code}</td>
                  <td className="py-2 text-right tabular-nums text-text-primary">
                    {Number(p.interest_rate)}% {p.interest_type === 'flat' ? 'Flat' : 'Reducing'}
                  </td>
                  <td className="py-2 text-right tabular-nums text-text-secondary">
                    {formatKwacha(Number(p.min_amount))} – {formatKwacha(Number(p.max_amount))}
                  </td>
                  <td className="py-2 text-text-secondary">{p.default_duration} {p.duration_unit}</td>
                  <td className="py-2 text-text-secondary">{freqLabel[p.repayment_frequency] ?? p.repayment_frequency}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${p.is_active ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>
                      {p.is_active ? 'Yes' : 'No'}
                    </span>
                  </td>
                  {isOwner && (
                    <td className="py-2">
                      <div className="flex gap-2 text-xs">
                        <Link href={`/settings/loan-products/${p.id}/edit`} className="text-accent-primary hover:underline">
                          Edit
                        </Link>
                        <button onClick={() => onToggle(p)} className="text-text-secondary hover:underline">
                          {p.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => onDelete(p)} className="text-danger hover:underline">
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setViewId(null)}>
          <div className="glass-card max-h-[85vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-text-primary">{viewing.name}</h2>
                <p className="font-mono text-xs text-text-muted">{viewing.code}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${viewing.is_active ? 'bg-success/10 text-success' : 'bg-text-muted/10 text-text-muted'}`}>
                {viewing.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            {viewing.description && <p className="mt-2 text-sm text-text-secondary">{viewing.description}</p>}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-text-muted">Amount range</dt><dd className="tabular-nums text-text-primary">{formatKwacha(Number(viewing.min_amount))} – {formatKwacha(Number(viewing.max_amount))}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Interest</dt><dd className="text-text-primary">{Number(viewing.interest_rate)}% {viewing.interest_type.replace('_', ' ')}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Term</dt><dd className="text-text-primary">{viewing.default_duration} {viewing.duration_unit}, {freqLabel[viewing.repayment_frequency]}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Processing fee</dt><dd className="text-text-primary">{viewing.processing_fee_type} {Number(viewing.processing_fee_value) > 0 ? formatKwacha(Number(viewing.processing_fee_value)) : ''}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Penalty</dt><dd className="text-text-primary">{viewing.penalty_rule_type.replace(/_/g, ' ')} ({Number(viewing.penalty_value)}){viewing.penalty_compounds ? ', compounds' : ''}</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Grace / default after</dt><dd className="text-text-primary">{viewing.grace_period_days} / {viewing.default_after_days} days</dd></div>
              <div className="flex justify-between"><dt className="text-text-muted">Allocation</dt><dd className="text-right text-text-primary">{ALLOCATION_PRESETS[viewing.allocation_order as keyof typeof ALLOCATION_PRESETS] ?? viewing.allocation_order}</dd></div>
            </dl>
            {isOwner && (
              <div className="mt-6 flex gap-2">
                <Link
                  href={`/settings/loan-products/${viewing.id}/edit`}
                  className="flex-1 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2.5 text-center text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
                >
                  Edit
                </Link>
                <button
                  onClick={() => { onToggle(viewing); setViewId(null); }}
                  className="flex-1 rounded-[var(--radius-button)] border border-border-subtle px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-glass"
                >
                  {viewing.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            )}
            <button onClick={() => setViewId(null)} className="mt-3 w-full py-2 text-center text-sm text-text-muted hover:text-text-primary">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
