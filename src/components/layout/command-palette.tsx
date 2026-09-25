'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  Users,
  HandCoins,
  Receipt,
  Send,
  Package,
  LayoutDashboard,
} from 'lucide-react';

interface Hit {
  key: string;
  group: string;
  label: string;
  sub?: string;
  href: string;
  icon: typeof FileText;
}

const GROUP_ICONS: Record<string, typeof FileText> = {
  Customers: Users,
  Loans: HandCoins,
  Payments: Receipt,
  Invitations: Send,
  Products: Package,
  Reports: FileText,
  Pages: LayoutDashboard,
};

const GROUP_ORDER = ['Customers', 'Loans', 'Payments', 'Invitations', 'Products', 'Reports', 'Pages'];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!open) {
          setQuery('');
          setHits([]);
          setActive(0);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open ]);

  const search = useCallback(async (q: string) => {
    const mySeq = ++seq.current;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`);
      if (!res.ok) throw new Error('search failed');
      const data = (await res.json()) as Record<string, Array<Record<string, unknown>>>;
      if (seq.current !== mySeq) return;
      const out: Hit[] = [];
      for (const group of GROUP_ORDER) {
        const rows = data[group.toLowerCase()] as Array<Record<string, unknown>> | undefined;
        if (!rows) continue;
        for (const r of rows) {
          const label =
            (r.name as string) || (r.loan_no as string) || (r.receipt_no as string) || (r.token as string) || '';
          const sub =
            (r.phone as string) ||
            (r.customer as string) ||
            (r.sub as string) ||
            (r.code as string) ||
            (r.status as string) ||
            undefined;
          out.push({
            key: `${group}-${String(r.id ?? label)}`,
            group,
            label,
            sub,
            href: r.href as string,
            icon: GROUP_ICONS[group] ?? FileText,
          });
        }
      }
      setHits(out);
      setActive(0);
    } catch {
      if (seq.current === mySeq) {
        setHits([]);
        setActive(0);
      }
    } finally {
      if (seq.current === mySeq) setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(query), 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, open, search]);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  useEffect(() => {
    if (!open || hits.length === 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active, open, hits.length]);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (hits.length === 0 ? 0 : (a + 1) % hits.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (hits.length === 0 ? 0 : (a - 1 + hits.length) % hits.length));
    } else if (e.key === 'Enter') {
      const hit = hits[active];
      if (hit) go(hit.href);
    }
  }

  if (!open) return null;

  const ordered: Array<Hit & { idx: number }> = [];
  for (const g of GROUP_ORDER) {
    for (const h of hits.filter((x) => x.group === g)) {
      ordered.push({ ...h, idx: ordered.length });
    }
  }
  const groups = GROUP_ORDER.filter((g) => ordered.some((h) => h.group === g));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24 max-sm:h-dvh max-sm:items-stretch max-sm:p-0"
      onClick={() => setOpen(false)}
    >
      <div
        className="glass-card max-h-[80dvh] w-full max-w-lg overflow-hidden max-sm:flex max-sm:max-h-none max-sm:h-dvh max-sm:max-w-none max-sm:flex-col max-sm:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border-subtle p-4">
          <Search size={18} className="text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search customers, loans, payments... (Esc to close)"
            className="min-h-11 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls="palette-listbox"
            aria-activedescendant={hits[active] ? `palette-${hits[active].key}` : undefined}
          />
          <kbd className="rounded border border-border-subtle px-1.5 py-0.5 text-[10px] text-text-muted max-sm:hidden">⌘K</kbd>
        </div>
        <div ref={listRef} id="palette-listbox" className="max-h-80 flex-1 overflow-y-auto p-2 max-sm:max-h-none" role="listbox">
          {searching && <p className="p-3 text-xs text-text-muted">Searching...</p>}
          {!searching && hits.length === 0 && (
            <p className="p-3 text-xs text-text-muted">
              {query.trim() ? `Nothing found for '${query.trim()}'` : 'Type to search across the workspace.'}
            </p>
          )}
          {groups.map((g) => (
            <div key={g}>
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{g}</p>
              {ordered
                .filter((h) => h.group === g)
                .map((h) => {
                  const isActive = h.idx === active;
                  return (
                    <button
                      key={h.key}
                      id={`palette-${h.key}`}
                      data-idx={h.idx}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => go(h.href)}
                      onMouseEnter={() => setActive(h.idx)}
                      className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left ${
                        isActive ? 'bg-surface-glass-2' : 'hover:bg-surface-glass'
                      }`}
                    >
                      <h.icon size={16} className="shrink-0 text-accent-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-text-primary">{h.label}</span>
                        {h.sub && <span className="block truncate text-xs text-text-muted">{h.sub}</span>}
                      </span>
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
