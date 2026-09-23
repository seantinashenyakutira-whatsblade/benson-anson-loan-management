'use client';

import { Crown, Shield, Briefcase, Wallet, CheckCircle2 } from 'lucide-react';

const ROLE_ICON: Record<string, React.ElementType> = {
  owner: Crown,
  branch_manager: Shield,
  loan_officer: Briefcase,
  cashier: Wallet,
};

export function RoleBadge({ role, verified = true }: { role: string; verified?: boolean }) {
  const Icon = ROLE_ICON[role] ?? Briefcase;
  return (
    <span className="relative inline-flex">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-glass text-text-secondary">
        <Icon size={12} />
      </span>
      {verified && (
        <span className="absolute -bottom-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-accent-primary text-white">
          <CheckCircle2 size={10} />
        </span>
      )}
    </span>
  );
}
