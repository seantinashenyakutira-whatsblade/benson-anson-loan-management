'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Syncs the <meta name="theme-color"> tag with the current theme.
 * Server viewport exports a static colour; this keeps the mobile
 * address bar / status bar in sync when the user switches themes.
 */
export function ThemeColorSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const color = resolvedTheme === 'light' ? '#F8FAFC' : '#061633';
    let tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'theme-color';
      document.head.appendChild(tag);
    }
    tag.content = color;
  }, [resolvedTheme]);

  return null;
}
