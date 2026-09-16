'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { ArrowLeft } from 'lucide-react';

interface DailyCollection {
  payment_date: string;
  total: number;
  count: number;
}

export default function CollectionsReport() {
  const [collections, setCollections] = useState<DailyCollection[]>([]);
  const [totals, setTotals] = useState({ total: 0, count: 0 });
  const [period, setPeriod] = useState('month');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchReport = async () => {
      const now = new Date();
      let startDate = '';
      if (period === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString().split('T')[0]!;
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]!;
      } else {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]!;
      }

      const { data } = await supabase
        .from('payments')
        .select('payment_date, amount')
        .eq('status', 'completed')
        .gte('payment_date', startDate)
        .order('payment_date', { ascending: false });

      if (data) {
        const grouped: Record<string, { total: number; count: number }> = {};
        data.forEach((p) => {
          const key = p.payment_date;
          if (!grouped[key]) grouped[key] = { total: 0, count: 0 };
          grouped[key]!.total += p.amount;
          grouped[key]!.count += 1;
        });
        const result = Object.entries(grouped)
          .map(([date, v]) => ({ payment_date: date, ...v }))
          .sort((a, b) => b.payment_date.localeCompare(a.payment_date));
        setCollections(result);
        setTotals({ total: data.reduce((s, p) => s + p.amount, 0), count: data.length });
      }
      setLoading(false);
    };
    fetchReport();
  }, [supabase, period]);

  return (
    <div className="space-y-4">
      <Link href="/reports" className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back to Reports
      </Link>

      <h1 className="text-2xl font-bold text-text-primary">Collection Report</h1>

      <div className="flex gap-1 rounded-[var(--radius-button)] bg-surface-glass p-1">
        {['week', 'month', 'year'].map((p) => (
          <button
            key={p}
            onClick={() => { setPeriod(p); setLoading(true); }}
            className={`flex-1 rounded-[var(--radius-button)] px-4 py-2 text-sm font-medium transition-all ${
              period === p ? 'bg-surface-glass-2 text-text-primary shadow-sm' : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted">Total Collected</p>
            <p className="text-2xl font-bold text-success">{formatKwacha(totals.total)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">Transactions</p>
            <p className="text-2xl font-bold text-text-primary">{totals.count}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-text-muted">Loading...</div>
      ) : collections.length === 0 ? (
        <div className="py-12 text-center text-text-muted">No collections found for this period.</div>
      ) : (
        <div className="space-y-2">
          {collections.map((c) => (
            <div key={c.payment_date} className="glass-card flex items-center justify-between p-4">
              <div>
                <p className="text-sm text-text-primary">{c.payment_date}</p>
                <p className="text-xs text-text-muted">{c.count} payment{c.count !== 1 ? 's' : ''}</p>
              </div>
              <p className="text-sm font-semibold text-success">{formatKwacha(c.total)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
