import Link from 'next/link';
import { BookOpen, Receipt, Wallet, ChartColumn, TrendingUp, TrendingDown, Scale, Landmark } from 'lucide-react';

const LINKS = [
  { href: '/accounting/journal', label: 'Journal', desc: 'All posted entries, expandable lines', icon: BookOpen },
  { href: '/accounting/cashbook', label: 'Cash Book', desc: 'Running cash balance by account', icon: Wallet },
  { href: '/accounting/chart-of-accounts', label: 'Chart of Accounts', desc: 'Account master data', icon: Landmark },
  { href: '/accounting/income', label: 'Income', desc: 'Record and review income', icon: TrendingUp },
  { href: '/accounting/expenses', label: 'Expenses', desc: 'Record and review expenses', icon: TrendingDown },
  { href: '/accounting/pnl', label: 'Profit & Loss', desc: 'Income vs expense by period', icon: ChartColumn },
  { href: '/accounting/balance-sheet', label: 'Balance Sheet', desc: 'Assets = Liabilities + Equity', icon: Scale },
  { href: '/accounting/journal-entries', label: 'Legacy Journal', desc: 'Old journal view (redirects)', icon: Receipt },
];

export default function AccountingLandingPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Accounting</h1>
        <p className="text-sm text-text-secondary">Ledgers, cash book and financial statements</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="glass-card glass-card-hover p-4 transition-all">
            <l.icon size={20} className="text-accent-primary" />
            <p className="mt-2 text-sm font-semibold text-text-primary">{l.label}</p>
            <p className="text-xs text-text-muted">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
