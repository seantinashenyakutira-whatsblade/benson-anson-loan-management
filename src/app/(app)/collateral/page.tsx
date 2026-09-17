'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search, Shield } from 'lucide-react';

interface CollateralItem {
  id: string;
  collateral_type: string;
  description: string;
  make_model: string | null;
  year: number | null;
  estimated_value: number;
  status: string;
  condition: string;
  customers?: { first_name: string; last_name: string };
}

export default function CollateralPage() {
  const [items, setItems] = useState<CollateralItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchCollateral = async () => {
      const { data } = await supabase
        .from('collateral')
        .select('*, customers(first_name, last_name)')
        .order('created_at', { ascending: false });

      if (data) setItems(data);
      setLoading(false);
    };

    fetchCollateral();
  }, [supabase]);

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    return (
      item.description.toLowerCase().includes(q) ||
      item.make_model?.toLowerCase().includes(q) ||
      item.collateral_type.toLowerCase().includes(q) ||
      item.customers?.first_name.toLowerCase().includes(q) ||
      item.customers?.last_name.toLowerCase().includes(q)
    );
  });

  const statusColor = (status: string) => {
    switch (status) {
      case 'available': return 'text-success';
      case 'pledged': return 'text-info';
      case 'repossessed': return 'text-warning';
      case 'released': return 'text-text-muted';
      default: return 'text-text-secondary';
    }
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'vehicle': return '🚗';
      case 'property': return '🏠';
      case 'electronics': return '💻';
      case 'equipment': return '🔧';
      case 'household_goods': return '📦';
      default: return '📋';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary">Collateral</h1>
        <Link
          href="/collateral/new"
          className="flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
        >
          <Plus size={16} />
          Add Collateral
        </Link>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
        <input
          type="text"
          placeholder="Search collateral..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Shield}
          headline="Vault is empty"
          message="Register collateral items here before pledging them to loans."
          actionLabel="Add first collateral"
          actionHref="/collateral/new"
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={`/collateral/${item.id}`}
              className="glass-card glass-card-hover block p-4 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{typeIcon(item.collateral_type)}</span>
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary">{item.description}</h3>
                  <p className="text-sm text-text-secondary">
                    {item.make_model && `${item.make_model} `}
                    {item.year && `(${item.year})`}
                    {item.customers && ` — ${item.customers.first_name} ${item.customers.last_name}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-text-primary">{formatKwacha(item.estimated_value)}</p>
                  <span className={`text-xs font-medium capitalize ${statusColor(item.status)}`}>
                    {item.status}
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
