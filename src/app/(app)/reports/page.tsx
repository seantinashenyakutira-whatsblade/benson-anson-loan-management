'use client';

import Link from 'next/link';
import { Surface } from '@/components/ui/surface';
import { TrendingUp, AlertTriangle, Wallet, Users, Activity, Banknote, Receipt, Scale, Award, Building2, FileText, DollarSign } from 'lucide-react';

const TIER_A = [
  { name: 'Expected vs Actual', description: 'Collections due vs collected per loan', icon: TrendingUp, href: '/reports/expected-vs-actual' },
  { name: 'Default Arrears', description: 'Every loan with arrears above zero', icon: AlertTriangle, href: '/reports/default-arrears' },
  { name: 'Outstanding Balances', description: 'Every active loan and what is owed', icon: Wallet, href: '/reports/outstanding' },
  { name: 'Customer Report', description: 'Customers with borrowing totals', icon: Users, href: '/reports/customers' },
  { name: 'Active Loans', description: 'Performing, at-risk and overdue loans', icon: Activity, href: '/reports/active-loans' },
  { name: 'Disbursements', description: 'Loans disbursed in the period', icon: Banknote, href: '/reports/disbursements' },
  { name: 'Repayments', description: 'Payments received in the period', icon: Receipt, href: '/reports/repayments' },
  { name: 'Income & Expense', description: 'Operational ledger with running balance', icon: Scale, href: '/reports/income-expense' },
  { name: 'Officer Performance', description: 'Portfolio aggregates per officer', icon: Award, href: '/reports/officer-performance' },
  { name: 'Branch Performance', description: 'Portfolio aggregates per branch', icon: Building2, href: '/reports/branch-performance' },
  { name: 'Penalties Report', description: 'Penalties with status and waived amounts', icon: AlertTriangle, href: '/reports/penalties' },
  { name: 'P&L Report', description: 'Profit and loss for the period', icon: FileText, href: '/reports/pl' },
  { name: 'Balance Sheet Report', description: 'Assets, liabilities and equity', icon: Scale, href: '/reports/balance-sheet' },
  { name: 'Collection Summary', description: 'Daily collections per branch and officer', icon: DollarSign, href: '/reports/collection-summary' },
];

const LEGACY = [
  { name: 'Loan Portfolio', description: 'Legacy portfolio overview', icon: FileText, href: '/reports/loan-portfolio' },
  { name: 'Collection Report', description: 'Legacy collection summary', icon: DollarSign, href: '/reports/collections' },
];

function Section({ title, items }: { title: string; items: typeof TIER_A }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-text-secondary">{title}</h2>
      <div className="space-y-2">
        {items.map((report) => (
          <Link
            key={report.name}
            href={report.href}
            className="block"
          >
            <Surface variant="glass-raised" className="flex items-center gap-4 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10">
                <report.icon size={20} className="text-accent-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-primary">{report.name}</h3>
                <p className="text-xs text-text-muted">{report.description}</p>
              </div>
            </Surface>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
      <Section title="Management Reports" items={TIER_A} />
      <Section title="Legacy" items={LEGACY} />
    </div>
  );
}
