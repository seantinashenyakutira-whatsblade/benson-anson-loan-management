'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from 'lucide-react';

interface CustomerOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface ProductOption {
  id: string;
  name: string;
  interest_rate: number;
  interest_type: string;
  default_duration: number;
  duration_unit: string;
  min_amount: number;
  max_amount: number;
}

export default function NewLoanPage() {
  const router = useRouter();
  const supabase = createClient();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [custRes, prodRes] = await Promise.all([
        supabase.from('customers').select('id, first_name, last_name').order('first_name'),
        supabase.from('loan_products').select('*').eq('is_active', true).order('name'),
      ]);
      if (custRes.data) setCustomers(custRes.data);
      if (prodRes.data) setProducts(prodRes.data);
    };
    fetchData();
  }, [supabase]);

  const selectedProductData = products.find((p) => p.id === selectedProduct);

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    const { data: appNumber, error: numError } = await supabase.rpc('rpc_generate_application_number');
    if (numError || !appNumber) {
      setSaving(false);
      alert('Error generating application number: ' + numError?.message);
      return;
    }

    const data = {
      application_number: appNumber as string,
      customer_id: formData.get('customer_id') as string,
      loan_product_id: formData.get('product_id') as string,
      requested_amount: Number(formData.get('principal_amount')),
      duration: Number(formData.get('term_count')),
      duration_unit: formData.get('term_unit') as string,
      purpose: (formData.get('purpose') as string) || null,
      status: 'draft' as const,
    };

    const { data: application, error } = await supabase
      .from('loan_applications')
      .insert(data)
      .select()
      .single();

    setSaving(false);

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    router.push(`/applications/${application.id}`);
  };

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card p-6">
        <h1 className="mb-2 text-2xl font-bold text-text-primary">New Loan Application</h1>
        <p className="mb-6 text-sm text-text-secondary">Approved applications convert into loans ready for disbursement.</p>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Customer *</label>
            <select
              name="customer_id"
              required
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="mt-1 text-xs text-text-secondary">
                No customers yet —{' '}
                <Link href="/customers/new" className="text-accent-primary hover:underline">
                  register the first customer
                </Link>{' '}
                before creating a loan.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Loan Product *</label>
            <select
              name="product_id"
              required
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            >
              <option value="">Select product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.interest_rate}% {p.interest_type})</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Principal Amount (K) *</label>
              <input
                name="principal_amount"
                type="number"
                step="0.01"
                required
                min={selectedProductData ? selectedProductData.min_amount : 0}
                max={selectedProductData ? selectedProductData.max_amount : undefined}
                className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              />
              {selectedProductData && (
                <p className="mt-1 text-xs text-text-muted">
                  Range: K{selectedProductData.min_amount.toLocaleString()} — K{selectedProductData.max_amount.toLocaleString()}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Term *</label>
                <input
                  name="term_count"
                  type="number"
                  required
                  min={1}
                  max={selectedProductData?.default_duration || 60}
                  defaultValue={selectedProductData?.default_duration || 12}
                  className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Unit *</label>
                <select
                  name="term_unit"
                  defaultValue={selectedProductData?.duration_unit || 'months'}
                  className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Loan Purpose</label>
            <input name="purpose" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-[var(--radius-button)] bg-accent-primary px-4 py-3 font-medium text-accent-on-primary hover:bg-accent-primary-hover disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
