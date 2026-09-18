'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/hooks/use-permissions';
import { Search, Plus } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: string;
  is_active: boolean;
}

export default function ChartOfAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', account_type: 'asset', description: '' });
  const { role } = usePermissions();
  const isOwner = role === 'owner';
  const supabase = createClient();

  useEffect(() => {
    const fetchAccounts = async () => {
      let query = supabase
        .from('chart_of_accounts')
        .select('*')
        .order('code');

      if (typeFilter !== 'all') {
        query = query.eq('account_type', typeFilter);
      }

      const { data } = await query;
      if (data) setAccounts(data);
      setLoading(false);
    };

    fetchAccounts();
  }, [supabase, typeFilter]);

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
  });

  const typeColor = (type: string) => {
    switch (type) {
      case 'asset': return 'text-success';
      case 'liability': return 'text-danger';
      case 'equity': return 'text-info';
      case 'revenue':
      case 'income': return 'text-accent-primary';
      case 'expense': return 'text-warning';
      default: return 'text-text-secondary';
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('chart_of_accounts').update({ is_active: !current }).eq('id', id);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, is_active: !current } : a)));
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .insert({ code: form.code.trim(), name: form.name.trim(), account_type: form.account_type, description: form.description.trim() || null })
      .select()
      .single();
    setSaving(false);
    if (error) {
      alert('Error: ' + error.message);
      return;
    }
    setAccounts((prev) => [...prev, data].sort((a, b) => a.code.localeCompare(b.code)));
    setForm({ code: '', name: '', account_type: 'asset', description: '' });
    setShowForm(false);
  };

  const groupedAccounts = filtered.reduce<Record<string, Account[]>>((acc, a) => {
    const key = a.account_type;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Chart of Accounts</h1>
        {isOwner && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
          >
            <Plus size={16} />
            Add Account
          </button>
        )}
      </div>

      {showForm && isOwner && (
        <form onSubmit={handleAdd} className="glass-card space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Code *</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required placeholder="5600" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Fuel Expense" className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Type *</label>
              <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none">
                <option value="asset">Asset</option>
                <option value="liability">Liability</option>
                <option value="equity">Equity</option>
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          </div>
          <button type="submit" disabled={saving} className="rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Account'}
          </button>
        </form>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-2.5 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="asset">Assets</option>
          <option value="liability">Liabilities</option>
          <option value="equity">Equity</option>
          <option value="revenue">Revenue</option>
          <option value="expense">Expenses</option>
        </select>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No accounts found.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAccounts).map(([type, items]) => (
            <div key={type}>
              <h2 className={`mb-2 text-sm font-semibold capitalize ${typeColor(type)}`}>{type}s</h2>
              <div className="glass-card divide-y divide-border-subtle">
                {items.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-text-muted">{account.code}</span>
                      <span className="text-sm text-text-primary">{account.name}</span>
                    </div>
                    {isOwner ? (
                      <button
                        onClick={() => toggleActive(account.id, account.is_active)}
                        className={`text-xs ${account.is_active ? 'text-success' : 'text-text-muted'} hover:underline`}
                        title="Toggle active"
                      >
                        {account.is_active ? 'Active' : 'Inactive'}
                      </button>
                    ) : (
                      <span className={`text-xs ${account.is_active ? 'text-success' : 'text-text-muted'}`}>
                        {account.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
