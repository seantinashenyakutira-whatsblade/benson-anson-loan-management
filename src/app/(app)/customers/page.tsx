'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';
import { Plus, Search, Users } from 'lucide-react';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  nrc_number: string | null;
  status: string;
  created_at: string;
  loans?: { count: number; outstanding: number }[];
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const { can } = usePermissions();
  const supabase = createClient();

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase
        .from('customers')
        .select('*, loans(count)')
        .order('created_at', { ascending: false });

      if (data) setCustomers(data);
      setLoading(false);
    };

    fetchCustomers();
  }, [supabase]);

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.first_name.toLowerCase().includes(q) ||
      c.last_name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      c.nrc_number?.toLowerCase().includes(q)
    );
  });

  const statusVariant = (status: string): 'success' | 'neutral' | 'danger' => {
    switch (status) {
      case 'active': return 'success';
      case 'blacklisted': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Customers</h1>
        {can('customers.create') && (
          <Link
            href="/customers/new"
            className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
          >
            <Plus size={16} />
            New Customer
          </Link>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
        <Input
          type="text"
          placeholder="Search by name, phone, or NRC..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="py-2.5 pl-10 pr-4"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          headline="No customers yet"
          message="Register your first customer to start building your loan portfolio."
          actionLabel="Register first customer"
          actionHref="/customers/new"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((customer) => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className="glass-card glass-card-hover block p-4 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">
                    {customer.first_name} {customer.last_name}
                  </h3>
                  <p className="text-sm text-text-secondary">{customer.phone}</p>
                  {customer.nrc_number && (
                    <p className="text-xs text-text-muted">NRC: {customer.nrc_number}</p>
                  )}
                </div>
                <div className="text-right">
                  <Badge variant={statusVariant(customer.status)} className="capitalize">
                    {customer.status}
                  </Badge>
                  {customer.loans && customer.loans.length > 0 && (
                    <p className="mt-1 text-xs text-text-muted">
                      {customer.loans[0]?.count} loans
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
