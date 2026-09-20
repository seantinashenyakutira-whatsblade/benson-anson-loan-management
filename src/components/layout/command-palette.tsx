'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Search, FileText, Users, HandCoins } from 'lucide-react';
import { TIER_A_SLUGS, REPORT_REGISTRY } from '@/lib/reports/registry';

interface Hit {
  key: string;
  group: string;
  label: string;
  sub?: string;
  href: string;
  icon: typeof FileText;
}

const TIER_B_SLUGS = ['penalties', 'pl', 'balance-sheet', 'collection-summary'];

export function CommandPalette() {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (!open) {
          setQuery('');
          setHits([]);
          setTimeout(() => inputRef.current?.focus(), 50);
        }
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const search = useCallback(
    (q: string) => {
      const term = q.trim().toLowerCase();
      const reportHits: Hit[] = [...TIER_A_SLUGS, ...TIER_B_SLUGS]
        .filter((slug) => {
          const def = REPORT_REGISTRY[slug];
          return def && (slug.includes(term) || def.title.toLowerCase().includes(term));
        })
        .slice(0, 6)
        .map((slug) => {
          const def = REPORT_REGISTRY[slug]!;
          return { key: `r-${slug}`, group: 'Reports', label: def.title, sub: def.subtitle, href: `/reports/${slug}`, icon: FileText };
        });

      if (term.length < 2) {
        setHits(reportHits);
        setSearching(false);
        return;
      }

      setSearching(true);
      Promise.all([
        supabase.from('customers').select('id, first_name, last_name, phone, nrc_number').or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,phone.ilike.%${term}%,nrc_number.ilike.%${term}%`).limit(5),
        supabase.from('loans').select('id, loan_number').ilike('loan_number', `%${term}%`).limit(5),
      ]).then(([custRes, loanRes]) => {
        const customerHits: Hit[] = ((custRes.data || []) as Array<{ id: string; first_name: string; last_name: string; phone: string }>).map((c) => ({
          key: `c-${c.id}`,
          group: 'Customers',
          label: `${c.first_name} ${c.last_name}`,
          sub: c.phone,
          href: `/customers/${c.id}`,
          icon: Users,
        }));
        const loanHits: Hit[] = ((loanRes.data || []) as Array<{ id: string; loan_number: string }>).map((l) => ({
          key: `l-${l.id}`,
          group: 'Loans',
          label: l.loan_number,
          href: `/loans/${l.id}`,
          icon: HandCoins,
        }));
        setHits([...reportHits, ...customerHits, ...loanHits]);
        setSearching(false);
      });
    },
    [supabase],
  );

  useEffect(() => {
    if (!open) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(query), 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, open, search]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  const groups = [...new Set(hits.map((h) => h.group))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-24" onClick={() => setOpen(false)}>
      <div className="glass-card w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-border-subtle p-4">
          <Search size={18} className="text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports, customers, loans... (Esc to close)"
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="rounded border border-border-subtle px-1.5 py-0.5 text-[10px] text-text-muted">⌘K</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {searching && <p className="p-3 text-xs text-text-muted">Searching...</p>}
          {!searching && hits.length === 0 && (
            <p className="p-3 text-xs text-text-muted">Type to search. Reports list by name; customers by name, phone or NRC; loans by loan number.</p>
          )}
          {groups.map((g) => (
            <div key={g}>
              <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-text-muted">{g}</p>
              {hits.filter((h) => h.group === g).map((h) => (
                <button
                  key={h.key}
                  onClick={() => go(h.href)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-surface-glass"
                >
                  <h.icon size={16} className="shrink-0 text-accent-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-text-primary">{h.label}</span>
                    {h.sub && <span className="block truncate text-xs text-text-muted">{h.sub}</span>}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
