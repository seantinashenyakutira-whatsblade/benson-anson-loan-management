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

export default function NewCollateralPage() {
  const router = useRouter();
  const supabase = createClient();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .order('first_name');
      if (data) setCustomers(data);
    };
    fetchCustomers();
  }, [supabase]);

  const handleSubmit = async (formData: FormData) => {
    const data = {
      customer_id: formData.get('customer_id') as string,
      collateral_type: formData.get('collateral_type') as string,
      description: formData.get('description') as string,
      make_model: formData.get('make_model') as string || null,
      year: formData.get('year') ? Number(formData.get('year')) : null,
      registration_number: formData.get('registration_number') as string || null,
      chassis_number: formData.get('chassis_number') as string || null,
      engine_number: formData.get('engine_number') as string || null,
      color: formData.get('color') as string || null,
      condition: formData.get('condition') as string || 'good',
      estimated_value: Math.round(Number(formData.get('estimated_value')) * 100),
      market_value: formData.get('market_value') ? Math.round(Number(formData.get('market_value')) * 100) : null,
      address: formData.get('address') as string || null,
      city: formData.get('city') as string || null,
      province: formData.get('province') as string || null,
      status: 'available',
      notes: formData.get('notes') as string || null,
    };

    const { data: collateral, error } = await supabase
      .from('collateral')
      .insert(data)
      .select()
      .single();

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    router.push(`/collateral/${collateral.id}`);
  };

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card p-6">
        <h1 className="mb-6 text-2xl font-bold text-text-primary">Add Collateral</h1>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Customer *</label>
            <select name="customer_id" required className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Type *</label>
              <select name="collateral_type" required className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
                <option value="vehicle">Vehicle</option>
                <option value="property">Property</option>
                <option value="electronics">Electronics</option>
                <option value="equipment">Equipment</option>
                <option value="household_goods">Household Goods</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Condition *</label>
              <select name="condition" required className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Description *</label>
            <input name="description" required placeholder="e.g. Toyota Corolla 2018" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Make/Model</label>
              <input name="make_model" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Year</label>
              <input name="year" type="number" min="1900" max="2030" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Color</label>
              <input name="color" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Registration No.</label>
              <input name="registration_number" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Chassis No.</label>
              <input name="chassis_number" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Engine No.</label>
              <input name="engine_number" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Estimated Value (K) *</label>
              <input name="estimated_value" type="number" step="0.01" required className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Market Value (K)</label>
              <input name="market_value" type="number" step="0.01" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Address</label>
            <input name="address" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">City</label>
              <input name="city" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Province</label>
              <input name="province" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Notes</label>
            <textarea name="notes" rows={3} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>

          <button
            type="submit"
            className="w-full rounded-[var(--radius-button)] bg-accent-primary px-4 py-3 font-medium text-accent-on-primary hover:bg-accent-primary-hover"
          >
            Add Collateral
          </button>
        </form>
      </div>
    </div>
  );
}
