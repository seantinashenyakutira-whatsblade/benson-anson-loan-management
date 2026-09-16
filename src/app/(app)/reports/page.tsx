'use client';

import Link from 'next/link';
import { FileText, Users, TrendingUp, DollarSign, AlertTriangle, BarChart3 } from 'lucide-react';

const reports = [
  { name: 'Loan Portfolio', description: 'Overview of all active loans, balances, and health', icon: TrendingUp, href: '/reports/loan-portfolio' },
  { name: 'Collection Report', description: 'Daily, weekly, and monthly collection summaries', icon: DollarSign, href: '/reports/collections' },
  { name: 'PAR Report', description: 'Portfolio at Risk analysis by aging bucket', icon: AlertTriangle, href: '/reports/par' },
  { name: 'Customer Report', description: 'Customer demographics and loan history', icon: Users, href: '/reports/customers' },
  { name: 'Branch Performance', description: 'Comparative branch metrics and targets', icon: BarChart3, href: '/reports/branches' },
  { name: 'Officer Performance', description: 'Loan officer productivity and collection rates', icon: FileText, href: '/reports/officers' },
];

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-text-primary">Reports</h1>

      <div className="space-y-2">
        {reports.map((report) => (
          <Link
            key={report.name}
            href={report.href}
            className="glass-card glass-card-hover flex items-center gap-4 p-4 transition-all"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10">
              <report.icon size={20} className="text-accent-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-text-primary">{report.name}</h3>
              <p className="text-xs text-text-muted">{report.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
