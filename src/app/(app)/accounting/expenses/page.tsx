'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { Search, Plus } from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  expense_date: string;
  reference_number: string | null;
  status: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchExpenses = async () => {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data } = await query;
      if (data) setExpenses(data);
      setLoading(false);
    };

    fetchExpenses();
  }, [supabase, categoryFilter]);

  const filtered = expenses.filter((e) => {
    const q = search.toLowerCase();
    return e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
  });

  const totalAmount = filtered.reduce((sum, e) => sum + e.amount, 0);

  const categoryColor = (cat: string) => {
    switch (cat) {
      case 'office_supplies': return 'bg-blue-100 text-blue-700';
      case 'transport': return 'bg-green-100 text-green-700';
      case 'utilities': return 'bg-yellow-100 text-yellow-700';
      case 'staff': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Expenses</h1>
        <button className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover">
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Total ({filtered.length} expenses)</span>
          <span className="text-lg font-bold text-danger">{formatKwacha(totalAmount)}</span>
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
          <option value="office_supplies">Office Supplies</option>
          <option value="transport">Transport</option>
          <option value="utilities">Utilities</option>
          <option value="staff">Staff</option>
          <option value="maintenance">Maintenance</option>
          <option value="other">Other</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No expenses found.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((expense) => (
            <div key={expense.id} className="glass-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-text-primary">{expense.description}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor(expense.category)}`}>
                      {expense.category.replace('_', ' ')}
                    </span>
                    {expense.reference_number && (
                      <span className="text-xs text-text-muted">Ref: {expense.reference_number}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-danger">{formatKwacha(expense.amount)}</p>
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
