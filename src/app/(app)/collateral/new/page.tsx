'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Surface } from '@/components/ui/surface';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
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
      <Button variant="ghost" size="sm" onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </Button>

      <Surface className="p-6">
        <h1 className="mb-6 text-2xl font-bold text-text-primary">Add Collateral</h1>

        <form action={handleSubmit} className="space-y-4">
          <Select label="Customer *" name="customer_id" required>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
            ))}
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Type *" name="collateral_type" required>
              <option value="vehicle">Vehicle</option>
              <option value="property">Property</option>
              <option value="electronics">Electronics</option>
              <option value="equipment">Equipment</option>
              <option value="household_goods">Household Goods</option>
              <option value="other">Other</option>
            </Select>
            <Select label="Condition *" name="condition" required>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </Select>
          </div>

          <Input label="Description *" name="description" required placeholder="e.g. Toyota Corolla 2018" />

          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Make/Model" name="make_model" />
            <Input label="Year" name="year" type="number" min="1900" max="2030" />
            <Input label="Color" name="color" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Registration No." name="registration_number" />
            <Input label="Chassis No." name="chassis_number" />
            <Input label="Engine No." name="engine_number" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Estimated Value (K) *" name="estimated_value" type="number" step="0.01" required />
            <Input label="Market Value (K)" name="market_value" type="number" step="0.01" />
          </div>

          <Input label="Address" name="address" />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="City" name="city" />
            <Input label="Province" name="province" />
          </div>

          <Textarea label="Notes" name="notes" rows={3} />

          <Button
            type="submit"
            variant="primary"
            className="w-full px-4 py-3 font-medium"
          >
            Add Collateral
          </Button>
        </form>
      </Surface>
    </div>
  );
}
