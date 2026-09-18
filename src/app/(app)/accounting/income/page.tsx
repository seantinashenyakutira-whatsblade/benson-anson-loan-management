'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { EmptyState } from '@/components/ui/empty-state';
import { Search, Plus, TrendingUp } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { INCOME_CATEGORIES } from '@/lib/accounting/accounts';

interface IncomeRecord {
  id: string;
  category: string;
  description: string;
  amount: number;
  income_date: string;
  branch_id: string | null;
  branches?: { name: string } | Array<{ name: string }> | null;
}

const CATEGORY_STYLES: Record<string, string> = {
  interest: 'bg-success/10 text-success',
  penalties: 'bg-danger/10 text-danger',
  processing_fees: 'bg-accent-primary/10 text-accent-primary',
  other: 'bg-text-muted/10 text-text-muted',
};

export default function IncomePage() {
  const [records, setRecords] = useState<IncomeRecord[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { can } = usePermissions();
  const supabase = createClient();

  useEffect(() => {
    const fetchIncome = async () => {
      let query = supabase
        .from('income_records')
        .select('*, branches(name)')
        .order('income_date', { ascending: false })
        .limit(200);

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data } = await query;
      if (data) setRecords(data as unknown as IncomeRecord[]);
      setLoading(false);
    };

    fetchIncome();
  }, [supabase, categoryFilter]);

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    return r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
  });

  const totalAmount = filtered.reduce((sum, r) => sum + r.amount, 0);

  const branchName = (r: IncomeRecord) => {
    const b = r.branches;
    if (Array.isArray(b)) return b[0]?.name;
    return b?.name;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Income</h1>
          <p className="text-sm text-text-secondary">Manual income auto-posts to the journal</p>
        </div>
        {can('expenses.create') && (
          <Link
            href="/accounting/income/new"
            className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
          >
            <Plus size={16} />
            Record Income
          </Link>
        )}
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Total ({filtered.length} records)</span>
          <span className="text-lg font-bold tabular-nums text-success">{formatKwacha(totalAmount)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search income..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="all">All Categories</option>
          {INCOME_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          headline="No income recorded"
          message="Interest, penalties and fees post automatically; record other income here."
          actionLabel="Record income"
          actionHref="/accounting/income/new"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((record) => (
            <div key={record.id} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">{record.description}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CATEGORY_STYLES[record.category] || CATEGORY_STYLES.other}`}>
                      {record.category.replace('_', ' ')}
                    </span>
                    {branchName(record) && <span className="text-xs text-text-muted">{branchName(record)}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-success">{formatKwacha(record.amount)}</p>
                  <p className="text-xs text-text-muted">{record.income_date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
