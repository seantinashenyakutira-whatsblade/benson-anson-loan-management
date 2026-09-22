'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { AccessDenied } from '@/components/layout/access-denied';
import { ProductForm } from '../product-form';

export default function NewLoanProductPage() {
  const { profile, loading } = useAuth();

  if (loading) {
    return <div className="py-12 text-center text-text-muted">Loading...</div>;
  }

  if (profile?.role !== 'owner') {
    return <AccessDenied role={profile?.role} />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href="/settings/loan-products" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary">
        <ArrowLeft size={16} /> Back to products
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-text-primary">New Loan Product</h1>
        <p className="text-sm text-text-secondary">Active products appear on applications and the landing page</p>
      </div>
      <ProductForm />
    </div>
  );
}
