'use client';

import { useEffect, useRef } from 'react';

/**
 * Scroll-reveal: observes '[data-reveal]' and '[data-keyword]' elements,
 * adding 'is-revealed' when they enter the viewport. Respects
 * prefers-reduced-motion (elements become visible instantly).
 * Call once in a client ancestor that is always mounted (the landing root).
 */
export function useReveal() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const els = Array.from(
      rootRef.current.querySelectorAll<HTMLElement>('[data-reveal], [data-keyword]'),
    );

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-revealed'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('is-revealed');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return rootRef;
}