import { cn } from '@/lib/utils';

type Variant = 'glass' | 'glass-raised' | 'solid' | 'overlay' | 'gradient';

const variantClasses: Record<Variant, string> = {
  glass: 'bg-surface-glass backdrop-blur-[20px] saturate-140 border border-border-subtle rounded-xl shadow-glass',
  'glass-raised':
    'bg-surface-glass backdrop-blur-[20px] saturate-140 border border-border-subtle rounded-xl shadow-raised hover:-translate-y-0.5 hover:shadow-glow transition-all duration-base ease-out',
  solid: 'bg-surface-solid border border-border-default rounded-lg',
  overlay: 'bg-surface-overlay backdrop-blur-[24px] saturate-160 border border-border-strong rounded-xl shadow-raised',
  gradient: 'bg-[var(--brand-gradient-soft)] border border-[rgba(0,166,224,0.16)] rounded-xl',
};

export function Surface({
  variant = 'glass',
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: Variant }) {
  return <div className={cn(variantClasses[variant], className)} {...props} />;
}
