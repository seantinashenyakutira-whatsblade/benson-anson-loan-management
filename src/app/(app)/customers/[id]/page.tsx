'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { ArrowLeft, Phone, Mail, MapPin, Briefcase } from 'lucide-react';
import Link from 'next/link';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  alt_phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  occupation: string | null;
  employer_name: string | null;
  nrc_number: string | null;
  next_of_kin_name: string | null;
  next_of_kin_phone: string | null;
  next_of_kin_relationship: string | null;
  status: string;
  created_at: string;
  loans?: Array<{
    id: string;
    loan_number: string;
    principal_amount: number;
    outstanding_balance: number;
    status: string;
    health: string;
  }>;
  collateral?: Array<{
    id: string;
    collateral_type: string;
    description: string;
    estimated_value: number;
    status: string;
  }>;
}

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchCustomer = async () => {
      const { data } = await supabase
        .from('customers')
        .select('*, loans(*), collateral(*)')
        .eq('id', params.id)
        .single();

      if (data) setCustomer(data);
      setLoading(false);
    };

    fetchCustomer();
  }, [params.id, supabase]);

  if (loading) {
    return <div className="py-12 text-center text-text-muted">Loading...</div>;
  }

  if (!customer) {
    return <div className="py-12 text-center text-text-muted">Customer not found.</div>;
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success';
      case 'inactive': return 'bg-text-muted/10 text-text-muted';
      case 'blacklisted': return 'bg-danger/10 text-danger';
      default: return 'bg-text-secondary/10 text-text-secondary';
    }
  };

  const healthColor = (health: string) => {
    switch (health) {
      case 'performing': return 'text-success';
      case 'at_risk': return 'text-warning';
      case 'overdue': return 'text-orange';
      case 'defaulted': return 'text-danger';
      default: return 'text-text-muted';
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back
      </button>

      <div className="glass-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {customer.first_name} {customer.last_name}
            </h1>
            <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium capitalize ${statusColor(customer.status)}`}>
              {customer.status}
            </span>
          </div>
          <Link
            href={`/customers/${customer.id}/edit`}
            className="rounded-[var(--radius-button)] border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:bg-surface-glass"
          >
            Edit
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="flex items-center gap-3 text-sm">
            <Phone size={16} className="text-text-muted" />
            <span className="text-text-secondary">{customer.phone}</span>
          </div>
          {customer.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail size={16} className="text-text-muted" />
              <span className="text-text-secondary">{customer.email}</span>
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin size={16} className="text-text-muted" />
              <span className="text-text-secondary">{customer.address}, {customer.city}</span>
            </div>
          )}
          {customer.occupation && (
            <div className="flex items-center gap-3 text-sm">
              <Briefcase size={16} className="text-text-muted" />
              <span className="text-text-secondary">{customer.occupation}</span>
            </div>
          )}
        </div>

        {customer.nrc_number && (
          <div className="mt-4 border-t border-border-subtle pt-4">
            <p className="text-xs text-text-muted">NRC Number</p>
            <p className="text-sm text-text-primary">{customer.nrc_number}</p>
          </div>
        )}

        {customer.next_of_kin_name && (
          <div className="mt-4 border-t border-border-subtle pt-4">
            <p className="text-xs text-text-muted">Next of Kin</p>
            <p className="text-sm text-text-primary">{customer.next_of_kin_name}</p>
            <p className="text-xs text-text-secondary">{customer.next_of_kin_relationship} — {customer.next_of_kin_phone}</p>
          </div>
        )}
      </div>

      {/* Loans */}
      <div className="glass-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Loans</h2>
        {!customer.loans || customer.loans.length === 0 ? (
          <p className="text-sm text-text-muted">No loans found.</p>
        ) : (
          <div className="space-y-2">
            {customer.loans.map((loan) => (
              <Link
                key={loan.id}
                href={`/loans/${loan.id}`}
                className="flex items-center justify-between rounded-xl border border-border-subtle p-3 hover:bg-surface-glass"
              >
                <div>
                  <p className="font-medium text-text-primary">{loan.loan_number}</p>
                  <p className="text-sm text-text-secondary">{formatKwacha(loan.principal_amount)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${healthColor(loan.health)}`}>
                    {loan.health.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatKwacha(loan.outstanding_balance)} outstanding
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Collateral */}
      <div className="glass-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Collateral</h2>
        {!customer.collateral || customer.collateral.length === 0 ? (
          <p className="text-sm text-text-muted">No collateral found.</p>
        ) : (
          <div className="space-y-2">
            {customer.collateral.map((col) => (
              <div
                key={col.id}
                className="flex items-center justify-between rounded-xl border border-border-subtle p-3"
              >
                <div>
                  <p className="font-medium text-text-primary">{col.description}</p>
                  <p className="text-sm text-text-secondary capitalize">{col.collateral_type.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-primary">{formatKwacha(col.estimated_value)}</p>
                  <p className="text-xs text-text-muted capitalize">{col.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
