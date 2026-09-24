'use client';

import { useActionState, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { forgotPassword, type ForgotPasswordState } from './actions';
import { BrandMark } from '@/components/layout/brand-mark';
import { Surface } from '@/components/ui/surface';
import { ThemeMenu } from '@/components/layout/theme-menu';

const initialState: ForgotPasswordState = { error: null, success: false };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPassword, initialState);
  const [email, setEmail] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (state.success) setCooldown(60);
  }, [state.success]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--brand-gradient-soft)] p-4">
      <Surface variant="glass-raised" className="w-full max-w-[440px] p-8 animate-[fadeIn_200ms_var(--ease-out)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark variant="full" height={40} />
          <h1 className="mt-4 text-2xl font-bold text-text-primary">
            {state.success ? 'Check your email' : 'Reset your password'}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {state.success
              ? `We've sent a reset link to ${email}. The link expires in 1 hour.`
              : "Enter your email and we'll send a reset link"}
          </p>
        </div>

        {state.success ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <CheckCircle2 size={48} className="text-success animate-[scaleIn_300ms_var(--ease-out)]" />
            </div>
            <button
              onClick={() => setCooldown(0)}
              disabled={cooldown > 0}
              className="w-full rounded-lg border border-border-default px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface-glass disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't receive it? Resend"}
            </button>
            <Link href="/login" className="block text-center text-sm text-accent-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[52px] w-full rounded-lg border border-border-default bg-surface-glass px-4 text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
                placeholder="you@bensonanson.loans"
              />
            </div>

            {state.error && (
              <div className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
                <AlertCircle size={16} className="shrink-0" />
                <span>Unable to send reset link. Please check your email and try again.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              className="h-[52px] w-full rounded-lg bg-[var(--brand-gradient)] px-4 font-medium text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-50"
            >
              {pending ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        {!state.success && (
          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="text-accent-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        )}
      </Surface>

      <div className="fixed bottom-4 right-4">
        <ThemeMenu />
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
