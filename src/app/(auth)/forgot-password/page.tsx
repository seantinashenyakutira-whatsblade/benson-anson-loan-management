'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { forgotPassword, type ForgotPasswordState } from './actions';

const initialState: ForgotPasswordState = { error: null, success: false };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPassword, initialState);

  return (
    <div className="glass-card p-8">
      <h2 className="mb-2 text-xl font-semibold text-text-primary">Reset Password</h2>
      <p className="mb-6 text-sm text-text-secondary">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {state.success ? (
        <div className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
          Check your email for the reset link.
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-text-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
              placeholder="you@bensonanson.loans"
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
            {pending ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <div className="mt-4 text-center text-sm text-text-secondary">
        <Link href="/login" className="text-accent-primary hover:underline">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
