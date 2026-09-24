'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { login, type LoginState } from './actions';
import { BrandMark } from '@/components/layout/brand-mark';
import { Surface } from '@/components/ui/surface';
import { ThemeMenu } from '@/components/layout/theme-menu';

const initialState: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--brand-gradient-soft)] p-4">
      <Surface variant="glass-raised" className="w-full max-w-[440px] p-8 animate-[fadeIn_200ms_var(--ease-out)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark variant="full" height={40} />
          <h1 className="mt-4 text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="mt-1 text-sm text-text-secondary">Sign in to Anson Benson Cash Solutions</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-text-secondary">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-[52px] w-full rounded-lg border border-border-default bg-surface-glass px-4 text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
              placeholder="you@bensonanson.loans"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-accent-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="h-[52px] w-full rounded-lg border border-border-default bg-surface-glass px-4 pr-10 text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-text-primary"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {state.error && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger animate-[shake_300ms_ease-out]">
              <AlertCircle size={16} className="shrink-0" />
              <span>Invalid email or password. Please try again.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-[52px] w-full rounded-lg bg-[var(--brand-gradient)] px-4 font-medium text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {pending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border-subtle" />
          <span className="text-xs text-text-muted">or</span>
          <span className="h-px flex-1 bg-border-subtle" />
        </div>

        <Link
          href="/apply"
          className="flex h-[52px] w-full items-center justify-center rounded-lg border border-border-default bg-transparent px-4 text-sm font-medium text-text-primary hover:bg-surface-glass"
        >
          Apply for a loan
        </Link>

        <p className="mt-6 text-center text-xs text-text-muted">Protected by enterprise-grade security</p>
      </Surface>

      <div className="fixed bottom-4 right-4">
        <ThemeMenu />
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-4px); } 40%,80% { transform: translateX(4px); } }
      `}</style>
    </div>
  );
}
