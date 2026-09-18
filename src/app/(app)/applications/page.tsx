'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, FileText } from 'lucide-react';
import { Suspense } from 'react';

interface Application {
  id: string;
  application_number: string;
  requested_amount: number;
  approved_amount: number | null;
  status: string;
  created_at: string;
  customers?: { first_name: string; last_name: string } | null;
  loan_products?: { name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-text-muted/10 text-text-muted',
  submitted: 'bg-info/10 text-info',
  under_review: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  returned: 'bg-orange/10 text-orange',
};

function ApplicationsList() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status') || 'all';
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchApps = async () => {
      let query = supabase
        .from('loan_applications')
        .select('*, customers(first_name, last_name), loan_products(name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data } = await query;
      if (data) setApps(data as unknown as Application[]);
      setLoading(false);
    };
    fetchApps();
  }, [supabase, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Applications</h1>
          <p className="text-sm text-text-secondary">Every loan starts as an application</p>
        </div>
        <Link
          href="/applications/new"
          className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
        >
          <Plus size={16} />
          New Application
        </Link>
      </div>

      <div className="flex gap-2">
        {['all', 'draft', 'submitted', 'approved', 'rejected'].map((s) => (
          <Link
            key={s}
            href={s === 'all' ? '/applications' : `/applications?status=${s}`}
            className={`rounded-full px-3 py-1.5 text-xs capitalize ${statusFilter === s ? 'bg-accent-primary text-accent-on-primary' : 'border border-border-subtle text-text-secondary hover:bg-surface-glass'}`}
          >
            {s.replace('_', ' ')}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : apps.length === 0 ? (
        <EmptyState
          icon={FileText}
          headline="No applications"
          message="Create the first loan application to start the lending workflow."
          actionLabel="New application"
          actionHref="/applications/new"
        />
      ) : (
        <div className="space-y-2">
          {apps.map((a) => (
            <Link key={a.id} href={`/applications/${a.id}`} className="glass-card glass-card-hover block p-4 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">{a.application_number}</h3>
                  <p className="text-sm text-text-secondary">
                    {a.customers?.first_name} {a.customers?.last_name} — {a.loan_products?.name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-text-primary">{formatKwacha(a.requested_amount)}</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[a.status] || STATUS_STYLES.draft}`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-text-muted">Loading...</div>}>
      <ApplicationsList />
    </Suspense>
  );
}
