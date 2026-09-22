'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { AccessDenied } from '@/components/layout/access-denied';
import { ProductForm } from '../../product-form';
import type { LoanProductInput } from '@/lib/validations/loan-product';

export default function EditLoanProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { profile, loading: authLoading } = useAuth();
  const [initial, setInitial] = useState<(LoanProductInput & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('loan_products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setNotFound(true);
        } else {
          setInitial({
            id: data.id,
            name: data.name,
            code: data.code,
            description: data.description ?? '',
            is_active: data.is_active,
            min_amount: Number(data.min_amount),
            max_amount: Number(data.max_amount),
            interest_rate: Number(data.interest_rate),
            interest_type: data.interest_type,
            default_duration: data.default_duration,
            duration_unit: data.duration_unit,
            repayment_frequency: data.repayment_frequency,
            processing_fee_type: data.processing_fee_type,
            processing_fee_value: Number(data.processing_fee_value),
            penalty_rule_type: data.penalty_rule_type,
            penalty_value: Number(data.penalty_value),
            penalty_compounds: data.penalty_compounds,
            penalty_cap: data.penalty_cap != null ? Number(data.penalty_cap) : undefined,
            grace_period_days: data.grace_period_days,
            default_after_days: data.default_after_days,
            allocation_order: data.allocation_order,
          });
        }
        setLoading(false);
      });
  }, [supabase, id]);

  if (authLoading || loading) {
    return <div className="py-12 text-center text-text-muted">Loading...</div>;
  }

  if (profile?.role !== 'owner') {
    return <AccessDenied role={profile?.role} />;
  }

  if (notFound || !initial) {
    return <div className="py-12 text-center text-text-muted">Product not found.</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/settings/loan-products" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back to products
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Edit {initial.name}</h1>
        <p className="text-sm text-text-secondary">Changes apply to new loans only — existing loans are unaffected</p>
      </div>
      <ProductForm initial={initial} />
    </div>
  );
}
