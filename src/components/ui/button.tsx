'use client';

import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
type Size = 'sm' | 'md' | 'lg';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-[var(--brand-gradient)] text-white shadow-glow hover:-translate-y-0.5 hover:shadow-glow border border-transparent',
  secondary: 'bg-transparent border border-border-default text-text-primary hover:bg-surface-glass',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-glass',
  danger: 'bg-danger text-white hover:bg-danger/90 border border-transparent',
  link: 'bg-transparent text-brand-bright underline-offset-4 hover:underline',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-[52px] px-6 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-[150ms] ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
