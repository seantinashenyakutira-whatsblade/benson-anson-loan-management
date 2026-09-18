import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export function AccessDenied({ role }: { role?: string | null }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="glass-card w-full max-w-sm p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <ShieldAlert size={24} />
        </div>
        <h1 className="mt-4 text-xl font-bold text-text-primary">Access Denied</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Your role{role ? ` (${role.replace('_', ' ')})` : ''} cannot access this section.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-[var(--radius-button)] bg-accent-primary px-6 py-2.5 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
