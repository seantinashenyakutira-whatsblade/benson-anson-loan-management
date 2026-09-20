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
    const root = rootRef.current;
    if (!root) return;

    const matches = (el: Element) =>
      el.matches('[data-reveal], [data-keyword]') ||
      Boolean(el.querySelector?.('[data-reveal], [data-keyword]'));

    const reducedMotion = () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let io: IntersectionObserver | null = null;

    const reveal = (el: Element) => el.classList.add('is-revealed');

    const { observe, unobserveTree } = (() => {
      if (reducedMotion()) {
        return {
          observe(el: Element) {
            reveal(el);
          },
          unobserveTree() {},
        };
      }
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              (e.target as Element).classList.add('is-revealed');
              io?.unobserve(e.target);
            }
          }
        },
        { threshold: 0.18 },
      );
      return {
        observe(el: Element) {
          io?.observe(el);
        },
        unobserveTree() {
          io?.disconnect();
        },
      };
    })();

    const scan = (rootNode: ParentNode) => {
      rootNode
        .querySelectorAll('[data-reveal], [data-keyword]')
        .forEach((el) => observe(el));
    };

    scan(root);

    const mo = new MutationObserver((records) => {
      for (const r of records) {
        for (const node of Array.from(r.addedNodes)) {
          if (!(node instanceof Element)) continue;
          if (matches(node)) observe(node);
          scan(node);
        }
      }
    });
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      unobserveTree();
    };
  }, []);

  return rootRef;
}