'use client';

import Link from 'next/link';
import { Quote } from 'lucide-react';
import { useProducts, useBusinessInfo, formatK, type ProductInfo } from './use-business';

function ProductCard({ p }: { p: ProductInfo }) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-extrabold text-[#005BAC]">{p.name}</h3>
      {p.description && <p className="mt-1 text-sm text-slate-600">{p.description}</p>}
      <p className="mt-4 text-2xl font-extrabold text-[#005BAC]">
        {formatK(p.min_amount)} <span className="text-sm font-medium text-slate-500">– {formatK(p.max_amount)}</span>
      </p>
      <ul className="mt-3 space-y-1 text-sm text-slate-600">
        <li>Interest: {p.interest_rate}% {p.interest_type.replace('_', ' ')}</li>
        <li>Term: up to {p.default_duration} {p.duration_unit}</li>
      </ul>
      <Link
        href={`/apply?product=${p.id}`}
        className="mt-5 rounded-xl bg-[#00A6E0] px-4 py-2.5 text-center text-sm font-bold text-white hover:brightness-95"
      >
        Apply for this product
      </Link>
    </div>
  );
}

export function ProductCards() {
  const products = useProducts();
  return (
    <section id="products" className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-extrabold text-[#005BAC]">Loan products</h2>
        <p className="mt-1 text-slate-600">Pick the plan that fits your pocket.</p>
        {products.length === 0 ? (
          <p className="mt-6 text-sm text-slate-500">Products loading…</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function Testimonial() {
  return (
    <section className="bg-[#F2F7FB]">
      <div className="mx-auto max-w-3xl px-4 py-14 text-center">
        <Quote size={32} className="mx-auto text-[#00A6E0]" />
        <p className="mt-4 text-xl font-medium leading-relaxed text-[#005BAC]">
          “I pledged my fridge on Monday morning and had school fees sorted by lunch. Fair value, clear terms.”
        </p>
        <p className="mt-3 text-sm text-slate-600">— A satisfied customer, Lusaka</p>
      </div>
    </section>
  );
}

export function FinalCta() {
  const info = useBusinessInfo();
  return (
    <section className="bg-[#005BAC]">
      <div className="mx-auto max-w-6xl px-4 py-14 text-center">
        <h2 className="text-3xl font-extrabold text-white">Ready to get started?</h2>
        <p className="mx-auto mt-2 max-w-xl text-blue-100">
          Apply in two minutes{info.phone ? ` or call us on ${info.phone}` : ''}. Our team responds within 24 hours.
        </p>
        <Link href="/apply" className="mt-6 inline-block rounded-xl bg-[#F5B300] px-8 py-3 font-bold text-[#061633] hover:brightness-95">
          Apply Now
        </Link>
      </div>
    </section>
  );
}
