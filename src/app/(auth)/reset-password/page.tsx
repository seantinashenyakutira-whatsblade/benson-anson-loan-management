'use client';

import { useActionState, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { resetPassword, type ResetPasswordState } from './actions';
import { BrandMark } from '@/components/layout/brand-mark';
import { Surface } from '@/components/ui/surface';
import { ThemeMenu } from '@/components/layout/theme-menu';

const initialState: ResetPasswordState = { error: null };

function strength(pw: string): { label: string; color: string; width: string } {
  if (pw.length < 6) return { label: 'Weak', color: 'bg-danger', width: '25%' };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /\d/.test(pw);
  const hasLength = pw.length >= 8;
  const score = [hasUpper, hasNumber, hasLength].filter(Boolean).length;
  if (score === 1) return { label: 'Fair', color: 'bg-warning', width: '50%' };
  if (score === 2) return { label: 'Strong', color: 'bg-success', width: '75%' };
  return { label: 'Very Strong', color: 'bg-success', width: '100%' };
}

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPassword, initialState);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);

  const s = useMemo(() => strength(password), [password]);
  const reqs = [
    { ok: password.length >= 8, text: '8+ characters' },
    { ok: /[A-Z]/.test(password), text: '1 uppercase' },
    { ok: /\d/.test(password), text: '1 number' },
  ];

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--brand-gradient-soft)] p-4">
      <Surface variant="glass-raised" className="w-full max-w-[440px] p-8 animate-[fadeIn_200ms_var(--ease-out)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark variant="full" height={40} />
          <h1 className="mt-4 text-2xl font-bold text-text-primary">Set a new password</h1>
          <p className="mt-1 text-sm text-text-secondary">Choose a strong password for your account</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-text-secondary">
              New Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={show ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[52px] w-full rounded-lg border border-border-default bg-surface-glass px-4 pr-10 text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
                placeholder="Enter new password"
              />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-text-muted hover:text-text-primary" aria-label={show ? 'Hide' : 'Show'}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="h-1.5 w-full rounded-full bg-border-subtle">
                  <div className={`h-1.5 rounded-full ${s.color}`} style={{ width: s.width }} />
                </div>
                <p className="mt-1 text-xs text-text-muted">{s.label}</p>
                <ul className="mt-1 space-y-0.5">
                  {reqs.map((r) => (
                    <li key={r.text} className={`flex items-center gap-1 text-xs ${r.ok ? 'text-success' : 'text-text-muted'}`}>
                      <CheckCircle2 size={12} className={r.ok ? 'text-success' : 'text-border-default'} /> {r.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-text-secondary">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={show ? 'text' : 'password'}
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-[52px] w-full rounded-lg border border-border-default bg-surface-glass px-4 text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20"
              placeholder="Confirm new password"
            />
            {confirm && password !== confirm && <p className="mt-1 text-xs text-danger">Passwords do not match</p>}
          </div>

          {state.error && (
            <div className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">
              <AlertCircle size={16} className="shrink-0" />
              <span>Unable to update password. Please try again.</span>
            </div>
          )}

          <button
            type="submit"
            disabled={pending || password !== confirm}
            className="h-[52px] w-full rounded-lg bg-[var(--brand-gradient)] px-4 font-medium text-white shadow-glow transition-all hover:-translate-y-0.5 hover:shadow-glow disabled:opacity-50"
          >
            {pending ? 'Updating...' : 'Update password'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link href="/login" className="text-accent-primary hover:underline">
            Back to Sign In
          </Link>
        </div>
      </Surface>

      <div className="fixed bottom-4 right-4">
        <ThemeMenu />
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
