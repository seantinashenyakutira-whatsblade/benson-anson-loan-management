'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { login, type LoginState } from './actions';

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div className="glass-card p-8">
      <h2 className="mb-6 text-xl font-semibold text-text-primary">Sign In</h2>

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

        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-text-secondary">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-[var(--radius-button)] border border-border-subtle bg-surface-glass px-4 py-3 text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
            placeholder="Enter your password"
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
          {pending ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm text-text-secondary">
        <Link href="/forgot-password" className="text-accent-primary hover:underline">
          Forgot password?
        </Link>
      </div>
    </div>
  );
}
