'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  interest_method: string;
  min_term: number;
  max_term: number;
  min_amount: number;
  max_amount: number;
}

interface CollateralOption {
  id: string;
  description: string;
  estimated_value: number;
}

export default function NewLoanPage() {
  const router = useRouter();
  const supabase = createClient();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [collateralItems, setCollateralItems] = useState<CollateralOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedCollateral, setSelectedCollateral] = useState<string[]>([]);

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

  useEffect(() => {
    if (!selectedCustomer) return;
    const fetchCollateral = async () => {
      const { data } = await supabase
        .from('collateral')
        .select('id, description, estimated_value')
        .eq('customer_id', selectedCustomer)
        .eq('status', 'available');
      if (data) setCollateralItems(data);
    };
    fetchCollateral();
  }, [selectedCustomer, supabase]);

  const selectedProductData = products.find((p) => p.id === selectedProduct);

  const handleSubmit = async (formData: FormData) => {
    const data = {
      customer_id: formData.get('customer_id') as string,
      product_id: formData.get('product_id') as string,
      principal_amount: Math.round(Number(formData.get('principal_amount')) * 100),
      term_count: Number(formData.get('term_count')),
      term_unit: formData.get('term_unit') as string,
      purpose: formData.get('purpose') as string || null,
      notes: formData.get('notes') as string || null,
      status: 'draft' as const,
    };

    const { data: loan, error } = await supabase
      .from('loan_applications')
      .insert(data)
      .select()
      .single();

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    // Link collateral if selected
    if (selectedCollateral.length > 0) {
      const collateralLinks = selectedCollateral.map((colId) => ({
        loan_id: loan.id,
        collateral_id: colId,
      }));
      await supabase.from('loan_collateral').insert(collateralLinks);
    }

    router.push(`/loans/${loan.id}`);
  };

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card p-6">
        <h1 className="mb-6 text-2xl font-bold text-text-primary">New Loan Application</h1>

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
                <option key={p.id} value={p.id}>{p.name} ({p.interest_rate}% {p.interest_method})</option>
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
                min={selectedProductData?.min_amount ? selectedProductData.min_amount / 100 : 0}
                max={selectedProductData?.max_amount ? selectedProductData.max_amount / 100 : undefined}
                className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
              />
              {selectedProductData && (
                <p className="mt-1 text-xs text-text-muted">
                  Range: K{(selectedProductData.min_amount / 100).toLocaleString()} — K{(selectedProductData.max_amount / 100).toLocaleString()}
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
                  min={selectedProductData?.min_term || 1}
                  max={selectedProductData?.max_term || 60}
                  defaultValue={selectedProductData?.min_term || 1}
                  className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Unit *</label>
                <select name="term_unit" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
                  <option value="months">Months</option>
                  <option value="weeks">Weeks</option>
                </select>
              </div>
            </div>
          </div>

          {/* Collateral selection */}
          {collateralItems.length > 0 && (
            <div>
              <label className="mb-2 block text-sm text-text-secondary">Collateral (optional)</label>
              <div className="space-y-2">
                {collateralItems.map((col) => (
                  <label key={col.id} className="flex items-center gap-3 rounded-xl border border-border-subtle p-3 hover:bg-surface-glass">
                    <input
                      type="checkbox"
                      value={col.id}
                      checked={selectedCollateral.includes(col.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCollateral([...selectedCollateral, col.id]);
                        } else {
                          setSelectedCollateral(selectedCollateral.filter((id) => id !== col.id));
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-text-primary">{col.description}</p>
                      <p className="text-xs text-text-muted">K{col.estimated_value.toLocaleString()}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Loan Purpose</label>
            <input name="purpose" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Notes</label>
            <textarea name="notes" rows={3} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>

          <button
            type="submit"
            className="w-full rounded-[var(--radius-button)] bg-accent-primary px-4 py-3 font-medium text-accent-on-primary hover:bg-accent-primary-hover"
          >
            Create Application
          </button>
        </form>
      </div>
    </div>
  );
}
