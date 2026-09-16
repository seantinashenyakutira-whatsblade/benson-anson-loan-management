'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { resetPassword, type ResetPasswordState } from './actions';

const initialState: ResetPasswordState = { error: null };

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);

  return (
    <div className="glass-card p-8">
      <h2 className="mb-2 text-xl font-semibold text-text-primary">Set New Password</h2>
      <p className="mb-6 text-sm text-text-secondary">
        Enter your new password below.
      </p>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-text-secondary">
            New Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            placeholder="Enter new password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm text-text-secondary">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            placeholder="Confirm new password"
          />
        </div>

        {state.error && (
          <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-[var(--radius-button)] bg-accent-primary px-4 py-3 font-medium text-accent-on-primary transition-colors hover:bg-accent-primary-hover disabled:opacity-50"
        >
          {pending ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-text-secondary">
        <Link href="/login" className="text-accent-primary hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
