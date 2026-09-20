'use client';

import { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';

/**
 * BrandMark — theme-aware logo (Phase 10.4).
 * - variant 'full': dark → logo.png (white art), light → logo-light.png
 *   ONLY if transparent. logo-light.png exists but is opaque (solid
 *   background), so light theme uses monogram + "ABC" wordmark.
 * - variant 'icon': always logo-icon.png.
 * Mounted guard keeps it hydration-safe (no flash of wrong logo).
 */
interface BrandMarkProps {
  variant?: 'full' | 'icon';
  height?: number;
  className?: string;
}

const LIGHT_LOGO_OPAQUE = true;

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

  if (resolvedTheme !== 'light' || LIGHT_LOGO_OPAQUE) {
    if (resolvedTheme === 'light' && LIGHT_LOGO_OPAQUE) {
      return (
        <span className={`inline-flex items-center gap-2 ${className || ''}`} style={{ height }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/monogram.svg" alt="ABC" style={{ height, width: 'auto' }} />
          <span className="text-lg font-extrabold tracking-tight text-text-primary">ABC</span>
        </span>
      );
    }
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/branding/logo.png" alt="Anson Benson Cash Solutions" style={{ height, width: 'auto' }} className={className} />;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/branding/logo-light.png" alt="Anson Benson Cash Solutions" style={{ height, width: 'auto' }} className={className} />;
}
