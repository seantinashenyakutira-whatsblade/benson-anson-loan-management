'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { EmptyState } from '@/components/ui/empty-state';
import { Search, Plus, TrendingDown } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { EXPENSE_CATEGORIES } from '@/lib/accounting/accounts';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  branch_id: string | null;
  branches?: { name: string } | Array<{ name: string }> | null;
}

const CATEGORY_STYLES: Record<string, string> = {
  rent: 'bg-info/10 text-info',
  salaries: 'bg-accent-primary/10 text-accent-primary',
  transport: 'bg-success/10 text-success',
  airtime: 'bg-warning/10 text-warning',
  utilities: 'bg-orange/10 text-orange',
  office: 'bg-text-muted/10 text-text-secondary',
  other: 'bg-text-muted/10 text-text-muted',
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const { can } = usePermissions();
  const supabase = createClient();

  useEffect(() => {
    const fetchExpenses = async () => {
      let query = supabase
        .from('expenses')
        .select('*, branches(name)')
        .order('expense_date', { ascending: false })
        .limit(200);

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data } = await query;
      if (data) setExpenses(data as unknown as Expense[]);
      setLoading(false);
    };

    fetchExpenses();
  }, [supabase, categoryFilter]);

  const filtered = expenses.filter((e) => {
    const q = search.toLowerCase();
    return e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
  });

  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);

  const branchName = (e: Expense) => {
    const b = e.branches;
    if (Array.isArray(b)) return b[0]?.name;
    return b?.name;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Expenses</h1>
          <p className="text-sm text-text-secondary">Every expense auto-posts to the journal</p>
        </div>
        {can('expenses.create') && (
          <Link
            href="/accounting/expenses/new"
            className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
          >
            <Plus size={16} />
            Record Expense
          </Link>
        )}
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Total ({filtered.length} expenses)</span>
          <span className="text-lg font-bold tabular-nums text-danger">{formatKwacha(totalAmount)}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search expenses..."
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
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c} className="capitalize">{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={TrendingDown}
          headline="No expenses yet"
          message="Recorded expenses appear here and post to the journal automatically."
          actionLabel="Record first expense"
          actionHref="/accounting/expenses/new"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((expense) => (
            <div key={expense.id} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">{expense.description}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${CATEGORY_STYLES[expense.category] || CATEGORY_STYLES.other}`}>
                      {expense.category}
                    </span>
                    {branchName(expense) && <span className="text-xs text-text-muted">{branchName(expense)}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-danger">{formatKwacha(expense.amount)}</p>
                  <p className="text-xs text-text-muted">{expense.expense_date}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
