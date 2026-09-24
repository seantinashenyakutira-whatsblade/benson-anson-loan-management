'use client';

import { cn } from '@/lib/utils';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  helper?: string;
  error?: string;
  size?: 'md' | 'lg';
}

export function Input({ label, helper, error, size = 'md', className, id, ...props }: InputProps) {
  const height = size === 'lg' ? 'h-[52px]' : 'h-11';
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">{label}</label>}
      <input
        id={inputId}
        className={cn(
          'w-full rounded-md border bg-surface-glass px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
          height,
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border-default focus:border-accent-primary focus:ring-accent-primary/20',
          className,
        )}
        aria-invalid={!!error}
        {...props}
      />
      {helper && !error && <p className="text-xs text-text-muted">{helper}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Textarea({ label, helper, error, className, id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; helper?: string; error?: string }) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">{label}</label>}
      <textarea
        id={inputId}
        className={cn(
          'w-full rounded-md border border-border-default bg-surface-glass px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50',
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : '',
          className,
        )}
        aria-invalid={!!error}
        {...props}
      />
      {helper && !error && <p className="text-xs text-text-muted">{helper}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Select({ label, helper, error, className, children, id, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; helper?: string; error?: string }) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1">
      {label && <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">{label}</label>}
      <select
        id={inputId}
        className={cn(
          'h-11 w-full rounded-md border bg-surface-glass px-3 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50',
          error ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border-default',
          className,
        )}
        aria-invalid={!!error}
        {...props}
      >
        {children}
      </select>
      {helper && !error && <p className="text-xs text-text-muted">{helper}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
