'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * BrandMark — theme-aware logo (Phase 10.4).
 * - variant 'full': dark → logo.png (white art), light → logo-light.png
 *   (dark art). logo-light.png is missing, so light theme falls back to
 *   monogram + "ABC" wordmark until the client supplies it.
 * - variant 'icon': always logo-icon.png.
 * Mounted guard keeps it hydration-safe (no flash of wrong logo).
 */
interface BrandMarkProps {
  variant?: 'full' | 'icon';
  height?: number;
  className?: string;
}

const LIGHT_LOGO_MISSING = true;

export function BrandMark({ variant = 'full', height = 32, className }: BrandMarkProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (variant === 'icon') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/branding/logo-icon.png" alt="ABC" style={{ height, width: 'auto' }} className={className} />;
  }

  if (!mounted) {
    return <span style={{ height, width: height * 3 }} className={className} aria-hidden />;
  }

  if (resolvedTheme !== 'light' || LIGHT_LOGO_MISSING) {
    if (resolvedTheme === 'light' && LIGHT_LOGO_MISSING) {
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
