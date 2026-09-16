'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from 'lucide-react';

export default function NewCustomerPage() {
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (formData: FormData) => {
    const data = {
      first_name: formData.get('first_name') as string,
      last_name: formData.get('last_name') as string,
      phone: formData.get('phone') as string,
      alt_phone: formData.get('alt_phone') as string || null,
      email: formData.get('email') as string || null,
      nrc_number: formData.get('nrc_number') as string || null,
      address: formData.get('address') as string || null,
      city: formData.get('city') as string || 'Lusaka',
      province: formData.get('province') as string || 'Lusaka',
      occupation: formData.get('occupation') as string || null,
      employer_name: formData.get('employer_name') as string || null,
      next_of_kin_name: formData.get('next_of_kin_name') as string || null,
      next_of_kin_phone: formData.get('next_of_kin_phone') as string || null,
      next_of_kin_relationship: formData.get('next_of_kin_relationship') as string || null,
      status: 'active',
    };

    const { data: customer, error } = await supabase
      .from('customers')
      .insert(data)
      .select()
      .single();

    if (error) {
      alert('Error: ' + error.message);
      return;
    }

    router.push(`/customers/${customer.id}`);
  };

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card p-6">
        <h1 className="mb-6 text-2xl font-bold text-text-primary">New Customer</h1>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">First Name *</label>
              <input name="first_name" required className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Last Name *</label>
              <input name="last_name" required className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Phone *</label>
              <input name="phone" required placeholder="+260 977 000000" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Alt Phone</label>
              <input name="alt_phone" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Email</label>
              <input name="email" type="email" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">NRC Number</label>
              <input name="nrc_number" placeholder="GRM123456/10/1" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-text-secondary">Address</label>
            <input name="address" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">City</label>
              <input name="city" defaultValue="Lusaka" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Province</label>
              <input name="province" defaultValue="Lusaka" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Occupation</label>
              <input name="occupation" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Employer</label>
              <input name="employer_name" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
          </div>

          <div className="border-t border-border-subtle pt-4">
            <h3 className="mb-3 text-sm font-medium text-text-secondary">Next of Kin</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Name</label>
                <input name="next_of_kin_name" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Phone</label>
                <input name="next_of_kin_phone" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Relationship</label>
                <input name="next_of_kin_relationship" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-[var(--radius-button)] bg-accent-primary px-4 py-3 font-medium text-accent-on-primary hover:bg-accent-primary-hover"
          >
            Create Customer
          </button>
        </form>
      </div>
    </div>
  );
}
