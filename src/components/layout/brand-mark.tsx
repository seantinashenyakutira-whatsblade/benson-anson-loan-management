'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';

/**
 * BrandMark — theme-aware logo.
 * Rule: dark → /branding/logo.png, light → /branding/logo-light.png,
 * icon → /branding/logo-icon.png (also used for favicon and PWA icons).
 * Full lockup shows on md+ screens; icon-only below md (mobile TopBar).
 * Mounted guard keeps it hydration-safe (no flash of wrong logo).
 */
interface BrandMarkProps {
  variant?: 'full' | 'icon';
  height?: number;
  className?: string;
}

export function BrandMark({ variant = 'full', height = 32, className }: BrandMarkProps) {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (variant === 'icon') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/branding/logo-icon.png" alt="ABC" style={{ height, width: 'auto' }} className={className} />;
  }

  if (!mounted) {
    return <span style={{ height, width: height * 3 }} className={className} aria-hidden />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  const full = <img src={resolvedTheme === 'light' ? '/branding/logo-light.png' : '/branding/logo.png'} alt="Anson Benson Cash Solutions" style={{ height, width: 'auto' }} className={`hidden md:block ${className || ''}`} />;
  return (
    <>
      {full}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/branding/logo-icon.png" alt="ABC" style={{ height: 32, width: 'auto' }} className="md:hidden" />
    </>
  );
}