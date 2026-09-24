import { cn } from '@/lib/utils';

type Variant = 'glass' | 'glass-raised' | 'solid' | 'overlay' | 'gradient' | 'bar';
type BorderSide = 'top' | 'bottom' | 'right' | 'left';

const variantClasses: Record<Variant, string> = {
  glass: 'bg-surface-glass backdrop-blur-[20px] saturate-140 border border-border-subtle rounded-xl shadow-glass',
  'glass-raised':
    'bg-surface-glass backdrop-blur-[20px] saturate-140 border border-border-subtle rounded-xl shadow-raised hover:-translate-y-0.5 hover:shadow-glow transition-all duration-base ease-out',
  solid: 'bg-surface-solid border border-border-default rounded-lg',
  overlay: 'bg-surface-overlay backdrop-blur-[24px] saturate-160 border border-border-strong rounded-xl shadow-raised',
  gradient: 'bg-[var(--brand-gradient-soft)] border border-[rgba(0,166,224,0.16)] rounded-xl',
  bar: 'bg-bg-base/80 backdrop-blur-[24px] saturate-180 shadow-none rounded-none',
};

const borderSideClasses: Record<BorderSide, string> = {
  top: 'border-t border-border-subtle',
  bottom: 'border-b border-border-subtle',
  right: 'border-r border-border-subtle',
  left: 'border-l border-border-subtle',
};

export function Surface({
  variant = 'glass',
  borderSide = 'bottom',
  as: Tag = 'div',
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & {
  variant?: Variant;
  borderSide?: BorderSide;
  as?: 'div' | 'header' | 'aside' | 'nav' | 'footer';
}) {
  return (
    <Tag
      className={cn(variantClasses[variant], variant === 'bar' && borderSideClasses[borderSide], className)}
      {...props}
    />
  );
}
