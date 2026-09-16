'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { Search, Phone, MessageSquare } from 'lucide-react';

interface Collection {
  loan_id: string;
  loan_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  outstanding_balance: number;
  days_overdue: number;
  overdue_amount: number;
  health: string;
  next_due_date: string;
  last_payment_date: string | null;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchCollections = async () => {
      const { data } = await supabase
        .from('v_customer_position')
        .select('*')
        .gt('days_overdue', 0)
        .order('days_overdue', { ascending: false });

      if (data) setCollections(data);
      setLoading(false);
    };

    fetchCollections();
  }, [supabase]);

  const filtered = collections.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.loan_number.toLowerCase().includes(q) ||
      c.customer_name.toLowerCase().includes(q)
    );
  });

  const urgencyColor = (days: number) => {
    if (days >= 90) return 'bg-danger/10 text-danger border-danger/20';
    if (days >= 30) return 'bg-orange/10 text-orange border-orange/20';
    return 'bg-warning/10 text-warning border-warning/20';
  };

  const totalOverdue = filtered.reduce((sum, c) => sum + c.overdue_amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Collections</h1>
        <div className="text-right">
          <p className="text-xs text-text-muted">{filtered.length} overdue loans</p>
          <p className="text-sm font-semibold text-danger">{formatKwacha(totalOverdue)} overdue</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
        <input
          type="text"
          placeholder="Search collections..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No overdue loans. All collections up to date.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div key={item.loan_id} className={`glass-card p-4 border ${urgencyColor(item.days_overdue)}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">{item.customer_name}</h3>
                  <Link href={`/loans/${item.loan_id}`} className="text-xs text-accent-primary hover:underline">
                    {item.loan_number}
                  </Link>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">
                      {item.days_overdue} days overdue
                    </span>
                    <span className="text-sm text-text-primary">{formatKwacha(item.overdue_amount)} due</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`tel:${item.customer_phone}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-text-secondary hover:bg-surface-glass"
                  >
                    <Phone size={16} />
                  </a>
                  <a
                    href={`sms:${item.customer_phone}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle text-text-secondary hover:bg-surface-glass"
                  >
                    <MessageSquare size={16} />
                  </a>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
                <span>Outstanding: {formatKwacha(item.outstanding_balance)}</span>
                {item.last_payment_date && <span>Last payment: {item.last_payment_date}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
