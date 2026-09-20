'use client';

import Image from 'next/image';
import {
  Car,
  Zap,
  ShieldCheck,
  Sliders,
  Users,
  ArrowRight,
  Phone,
} from 'lucide-react';
import { useApply } from '@/components/marketing/apply-provider';
import type { BusinessInfo } from './use-business';

const MAX = (w: number) => `(min-width:1024px) ${w / 16}vw, 100vw`;

export function Hero() {
  const { open } = useApply();
  return (
    <section className="lp-hero-wrap">
      <div className="lp-hero-glow" aria-hidden />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div data-reveal>
          <p className="lp-eyebrow">Collateral based loans · K500 – K30,000</p>
          <h1 className="lp-h1 mt-5">
            Your Needs Our <em data-keyword className="lp-keyword">Support</em>
          </h1>
          <p className="lp-sub mt-5 max-w-lg">
            Turn your needs into reality with Anson Benson Cash Solutions Limited. Fast,
            fair loans against the assets you already own — approved in 24 hours.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={open} className="lp-btn-gold">
              Apply Now <ArrowRight size={18} />
            </button>
            <a href="#how" className="lp-btn-outline">
              How it works
            </a>
          </div>
        </div>

        <div data-reveal className="w-full">
          <Image
            src="/marketing/hero.webp"
            alt="A loan consultant presenting an Anson Benson loan plan"
            width={600}
            height={600}
            priority
            className="lp-hero-img"
            sizes={MAX(600)}
          />
        </div>
      </div>
    </section>
  );
}

export function StatsBar({ locations }: { locations: string[] }) {
  const stats = [
    { value: 'K500 – K30,000', label: 'Loan range' },
    { value: '24 Hour', label: 'Approval' },
    { value: '6', label: 'Categories' },
    { value: String(locations.length > 0 ? locations.length : 2), label: 'Locations' },
  ];
  return (
    <section className="lp-stats">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="text-center" data-reveal>
            <p className="lp-stat-value">{s.value}</p>
            <p className="lp-stat-label mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const TILES: Array<{ title: string; desc: string; img?: string }> = [
  { title: 'Vehicles', desc: 'Cars, minibuses and motorbikes with papers.' },
  { title: 'Electronics', desc: 'Smartphones, tablets and cameras.', img: '/marketing/collateral/phone.webp' },
  { title: 'Appliances', desc: 'Refrigerators, freezers and washing machines.', img: '/marketing/collateral/fridge.webp' },
  { title: 'TV & Audio', desc: 'Flat-screen TVs and sound systems.', img: '/marketing/collateral/tv.webp' },
  { title: 'Business Equipment', desc: 'Laptops, printers and office tools.', img: '/marketing/collateral/laptop.webp' },
  { title: 'Other', desc: 'Ask us — if it holds value, it counts.', img: '/marketing/collateral/other.webp' },
];

export function CollateralGrid() {
  return (
    <section id="products" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
      <div data-reveal>
        <p className="lp-eyebrow">What we accept</p>
        <h2 className="lp-h2 mt-3">
          Your asset. Our <em data-keyword className="lp-keyword">advance</em>.
        </h2>
        <p className="lp-sub mt-3 max-w-xl">
          Bring the asset, get a fair valuation, walk out with cash the same day.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-5">
        {TILES.map((t, i) => (
          <div key={t.title} className="lp-tile" data-reveal style={{ transitionDelay: `${i * 40}ms` }}>
            <div className="lp-tile-img">
              {t.img ? (
                <Image
                  src={t.img}
                  alt={t.title}
                  fill
                  sizes={MAX(260)}
                  loading="lazy"
                />
              ) : (
                <div className="lp-tile-fallback">
                  <Car size={44} className="text-[#00a6e0]" />
                </div>
              )}
            </div>
            <div className="p-4 pb-5">
                <h3 className="lp-display text-[15px] font-bold text-white">{t.title}</h3>
              <p className="mt-1 text-[13px] leading-snug text-[#a0b4d0]">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { img: '/marketing/step-1-apply.webp', title: 'Apply online or visit us', desc: 'Tell us how much you need and what you can pledge.' },
  { img: '/marketing/step-2-valuation.webp', title: 'Get your collateral valued', desc: 'Fair, transparent valuation in minutes.' },
  { img: '/marketing/step-3-cash.webp', title: 'Receive cash same day', desc: 'Approved loans disburse the same day you qualify.' },
  { img: '/marketing/step-4-repay.webp', title: 'Repay on your schedule', desc: 'Flexible plans that fit your cash flow.' },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-y border-[#ffffff10] bg-[#0a2249]/40">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="text-center" data-reveal>
          <p className="lp-eyebrow justify-center">How it works</p>
          <h2 className="lp-h2 mt-3">
            From application to <em data-keyword className="lp-keyword">cash</em> in four steps
          </h2>
        </div>

        <div className="relative mt-10 grid gap-5 md:grid-cols-4">
          <div aria-hidden className="absolute left-8 right-8 top-5 hidden h-px bg-gradient-to-r from-transparent via-[#f5b300]/40 to-transparent md:block" />
          {STEPS.map((s, i) => (
            <div key={s.title} className="lp-step-card" data-reveal style={{ transitionDelay: `${i * 60}ms` }}>
              <div className="lp-tile-img">
                <Image src={s.img} alt={s.title} fill sizes={MAX(220)} loading="lazy" />
              </div>
              <div className="p-4">
                <p className="lp-step-num">0{i + 1}</p>
                <h3 className="lp-display mt-2 text-[15px] font-bold text-white">{s.title}</h3>
                <p className="mt-1 text-[13px] leading-snug text-[#a0b4d0]">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const TRUST = [
  { icon: Zap, title: 'Fast Approval', desc: 'Decisions within 24 hours' },
  { icon: ShieldCheck, title: 'Safe & Secure', desc: 'Insured, protected collateral' },
  { icon: Sliders, title: 'Flexible', desc: 'Daily, weekly or monthly plans' },
  { icon: Users, title: 'Friendly Support', desc: 'Real people, real help' },
];

export function TrustStrip() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {TRUST.map((t, i) => (
          <div key={t.title} className="flex items-center gap-3 rounded-2xl border border-[#ffffff10] bg-[#0a2249]/50 p-4" data-reveal style={{ transitionDelay: `${i * 40}ms` }}>
            <t.icon size={24} className="shrink-0 text-[#f5b300]" />
            <div>
              <p className="text-sm font-bold text-white">{t.title}</p>
              <p className="text-xs text-[#6b7f9e]">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Testimonial() {
  return (
    <section className="lp-testimonial">
      <div className="lp-testimonial-bg" aria-hidden />
      <div className="relative z-10 px-4 py-16 sm:px-6 lg:py-20" data-reveal>
        <blockquote className="lp-testimonial-card">
          <p className="text-lg font-medium leading-relaxed text-white sm:text-xl">
            “I pledged my fridge on Monday morning and had school fees sorted by lunch.
            Fair value, clear terms, <em className="lp-keyword">no stress</em>.”
          </p>
          <footer className="mt-4 text-sm text-[#a0b4d0]">
            — A satisfied customer, <span className="text-[#f5b300]">Lusaka</span>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}

export function FinalCta({ info }: { info: BusinessInfo }) {
  const { open } = useApply();
  return (
    <section className="lp-cta">
      <div className="lp-cta-bg" aria-hidden />
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="lp-h2" data-reveal>
          Ready to get <em data-keyword className="lp-keyword">started</em>?
        </h2>
        <p className="lp-sub mx-auto mt-4 max-w-lg text-[#c9d6ea]">
          Apply in two minutes. Our team responds within 24 hours — usually much sooner.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button onClick={open} className="lp-btn-gold">
            Apply Now <ArrowRight size={18} />
          </button>
          <a href={`tel:${info.phone.replace(/\s/g, '')}`} className="lp-btn-outline">
            <Phone size={18} />
            Or call us: {info.phone}
          </a>
        </div>
      </div>
    </section>
  );
}