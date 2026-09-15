'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker for PWA support.
 * Placed in the root layout to ensure SW is registered on every page.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        // SW registration failed — non-critical, app still works
        console.warn('Service worker registration failed:', error);
      });
    }
  }, []);

  return null;
}
