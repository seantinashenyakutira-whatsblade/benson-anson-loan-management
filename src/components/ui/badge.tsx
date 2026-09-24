import { cn } from '@/lib/utils';

type Variant = 'success' | 'warning' | 'orange' | 'danger' | 'info' | 'neutral' | 'brand';
type Size = 'sm' | 'md';

const variantClasses: Record<Variant, string> = {
  success: 'bg-success-soft text-success border border-success/20',
  warning: 'bg-warning-soft text-warning border border-warning/20',
  orange: 'bg-orange-soft text-orange border border-orange/20',
  danger: 'bg-danger-soft text-danger border border-danger/20',
  info: 'bg-info-soft text-info border border-info/20',
  neutral: 'bg-surface-glass text-text-muted border border-border-subtle',
  brand: 'bg-[var(--brand-gradient-soft)] text-brand-bright border border-[rgba(0,166,224,0.16)]',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ variant = 'neutral', size = 'sm', className, ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: Variant; size?: Size }) {
  return <span className={cn('inline-flex items-center rounded-full font-semibold', variantClasses[variant], sizeClasses[size], className)} {...props} />;
}
