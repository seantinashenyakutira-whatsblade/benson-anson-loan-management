'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatKwacha } from '@/lib/money';
import { ArrowLeft } from 'lucide-react';

interface PortfolioSummary {
  totalLoans: number;
  totalPrincipal: number;
  totalOutstanding: number;
  performing: number;
  atRisk: number;
  overdue: number;
  defaulted: number;
  fullyPaid: number;
}

export default function LoanPortfolioReport() {
  const [summary, setSummary] = useState<PortfolioSummary>({
    totalLoans: 0, totalPrincipal: 0, totalOutstanding: 0,
    performing: 0, atRisk: 0, overdue: 0, defaulted: 0, fullyPaid: 0,
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchReport = async () => {
      const { data: loans } = await supabase
        .from('loans')
        .select('principal_amount, outstanding_balance, status, health')
        .in('status', ['disbursed', 'performing', 'at_risk', 'overdue', 'defaulted', 'fully_paid']);

      if (loans) {
        setSummary({
          totalLoans: loans.length,
          totalPrincipal: loans.reduce((s, l) => s + l.principal_amount, 0),
          totalOutstanding: loans.reduce((s, l) => s + l.outstanding_balance, 0),
          performing: loans.filter((l) => l.health === 'performing').length,
          atRisk: loans.filter((l) => l.health === 'at_risk').length,
          overdue: loans.filter((l) => l.health === 'overdue').length,
          defaulted: loans.filter((l) => l.health === 'defaulted').length,
          fullyPaid: loans.filter((l) => l.status === 'fully_paid').length,
        });
      }
      setLoading(false);
    };
    fetchReport();
  }, [supabase]);

  if (loading) return <div className="py-12 text-center text-text-muted">Loading...</div>;

  const healthData = [
    { label: 'Performing', count: summary.performing, color: 'bg-success', pct: summary.totalLoans ? Math.round((summary.performing / summary.totalLoans) * 100) : 0 },
    { label: 'At Risk', count: summary.atRisk, color: 'bg-warning', pct: summary.totalLoans ? Math.round((summary.atRisk / summary.totalLoans) * 100) : 0 },
    { label: 'Overdue', count: summary.overdue, color: 'bg-orange', pct: summary.totalLoans ? Math.round((summary.overdue / summary.totalLoans) * 100) : 0 },
    { label: 'Defaulted', count: summary.defaulted, color: 'bg-danger', pct: summary.totalLoans ? Math.round((summary.defaulted / summary.totalLoans) * 100) : 0 },
    { label: 'Fully Paid', count: summary.fullyPaid, color: 'bg-info', pct: summary.totalLoans ? Math.round((summary.fullyPaid / summary.totalLoans) * 100) : 0 },
  ];

  return (
    <div className="space-y-4">
      <Link href="/reports" className="flex items-center gap-2 text-text-secondary hover:text-text-primary">
        <ArrowLeft size={18} />
        Back to Reports
      </Link>

      <h1 className="text-2xl font-bold text-text-primary">Loan Portfolio Report</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted">Total Loans</p>
          <p className="text-2xl font-bold text-text-primary">{summary.totalLoans}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted">Total Principal</p>
          <p className="text-2xl font-bold text-text-primary">{formatKwacha(summary.totalPrincipal)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted">Outstanding Balance</p>
          <p className="text-2xl font-bold text-warning">{formatKwacha(summary.totalOutstanding)}</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs text-text-muted">Collection Rate</p>
          <p className="text-2xl font-bold text-success">
            {summary.totalPrincipal > 0 ? Math.round(((summary.totalPrincipal - summary.totalOutstanding) / summary.totalPrincipal) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="glass-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-secondary">Portfolio Health</h2>
        {/* Stacked bar */}
        <div className="mb-3 flex h-4 overflow-hidden rounded-full bg-surface-glass">
          {healthData.map((h) => (
            h.pct > 0 && (
              <div
                key={h.label}
                className={`${h.color} transition-all`}
                style={{ width: `${h.pct}%` }}
                title={`${h.label}: ${h.count} (${h.pct}%)`}
              />
            )
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {healthData.map((h) => (
            <div key={h.label} className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${h.color}`} />
              <div>
                <p className="text-xs text-text-muted">{h.label}</p>
                <p className="text-sm font-medium text-text-primary">{h.count}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
