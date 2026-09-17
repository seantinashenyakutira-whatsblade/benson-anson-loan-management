import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  headline: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export function EmptyState({ icon: Icon, headline, message, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="glass-card flex flex-col items-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
        <Icon size={24} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-text-primary">{headline}</h3>
      <p className="mt-1 max-w-xs text-sm text-text-secondary">{message}</p>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="mt-5 flex items-center gap-2 rounded-[var(--radius-button)] bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
        >
          <Plus size={16} />
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
