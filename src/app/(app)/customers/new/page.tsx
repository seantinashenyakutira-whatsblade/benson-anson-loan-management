'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </Button>

      <Surface className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-text-primary">New Customer</h1>

        <form action={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First Name *" name="first_name" required />
            <Input label="Last Name *" name="last_name" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Phone *" name="phone" required placeholder="+260 977 000000" />
            <Input label="Alt Phone" name="alt_phone" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Email" name="email" type="email" />
            <Input label="NRC Number" name="nrc_number" placeholder="GRM123456/10/1" />
          </div>

          <Input label="Address" name="address" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="City" name="city" defaultValue="Lusaka" />
            <Input label="Province" name="province" defaultValue="Lusaka" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Occupation" name="occupation" />
            <Input label="Employer" name="employer_name" />
          </div>

          <div className="border-t border-border-subtle pt-4">
            <h3 className="mb-3 text-sm font-medium text-text-secondary">Next of Kin</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Name" name="next_of_kin_name" />
              <Input label="Phone" name="next_of_kin_phone" />
              <Input label="Relationship" name="next_of_kin_relationship" />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full px-4 py-3 font-medium"
          >
            Create Customer
          </Button>
        </form>
      </Surface>
    </div>
  );
}
