'use client';

import { ArrowRight, Phone } from 'lucide-react';
import { useApply } from '@/components/marketing/apply-provider';
import { useBusinessInfo, formatK, type ProductInfo } from './use-business';

function ProductCard({ p }: { p: ProductInfo }) {
  const { open } = useApply();
  return (
    <div className="lp-tile flex flex-col p-6" data-reveal>
      <h3 className="lp-display text-lg font-bold text-white">{p.name}</h3>
      {p.description && <p className="mt-1 text-sm leading-snug text-[#a0b4d0]">{p.description}</p>}
      <p className="mt-4 text-2xl font-bold text-[#f5b300]">
        {formatK(p.min_amount)}{' '}
        <span className="text-sm font-medium text-[#6b7f9e]">– {formatK(p.max_amount)}</span>
      </p>
      <ul className="mt-3 space-y-1 text-sm text-[#a0b4d0]">
        <li>Interest: {p.interest_rate}% {p.interest_type.replace('_', ' ')}</li>
        <li>Term: up to {p.default_duration} {p.duration_unit}</li>
      </ul>
      <button onClick={open} className="lp-btn-gold mt-6 text-sm">
        Apply for this product <ArrowRight size={16} />
      </button>
    </div>
  );
}

export function ProductCards({ initial }: { initial: ProductInfo[] }) {
  const { phone } = useBusinessInfo();
  const shown = initial.slice(0, 3);
  return (
    <section id="pricing" className="border-y border-[#ffffff10] bg-[#0a2249]/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div data-reveal>
          <p className="lp-eyebrow">Loan products</p>
          <h2 className="lp-h2 mt-3">
            Plans that fit your <em data-keyword className="lp-keyword">pocket</em>
          </h2>
          <p className="lp-sub mt-3">Rates from 15%. Terms available up to 1 month.</p>
        </div>

        {shown.length === 0 ? (
          <div className="mt-8 text-sm text-[#6b7f9e]">
            <p>Products coming soon. Call us to discuss your loan.</p>
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="mt-2 inline-flex items-center gap-1 font-medium text-[#00a6e0] hover:text-[#f5b300]"
            >
              <Phone size={14} /> Call us
            </a>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {shown.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}