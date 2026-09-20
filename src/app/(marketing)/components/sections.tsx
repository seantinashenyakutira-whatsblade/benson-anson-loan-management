import Link from 'next/link';
import { Zap, BadgePercent, ShieldCheck, MapPin, Car, Smartphone, Refrigerator, Briefcase, Tv, Package } from 'lucide-react';

export function Hero({ locations }: { locations: string[] }) {
  return (
    <section className="bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="inline-block rounded-full bg-[#00A6E0]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#005BAC]">
            {locations.length > 0 ? locations.join(' · ') : 'Zambia'} · Collateral-based lending
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-[#005BAC] lg:text-5xl">
            Cash when you need it. Keep what matters.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Fast, fair loans against the assets you already own. Vehicles, electronics, appliances, and more.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/apply" className="rounded-xl bg-[#00A6E0] px-6 py-3 font-bold text-white hover:brightness-95">
              Apply Now
            </Link>
            <a href="#how" className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-[#005BAC] hover:bg-slate-50">
              How it works
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Car, label: 'Vehicles' },
            { icon: Refrigerator, label: 'Appliances' },
            { icon: Tv, label: 'TVs & Electronics' },
            { icon: Smartphone, label: 'Phones' },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-3 rounded-2xl bg-[#EAF4FA] p-5">
              <c.icon size={28} className="shrink-0 text-[#00A6E0]" />
              <span className="font-semibold text-[#005BAC]">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustBar() {
  const items = [
    { icon: Zap, title: '24hr Approval', desc: 'Decisions within one business day' },
    { icon: BadgePercent, title: 'Fair Rates', desc: 'Clear terms, no hidden fees' },
    { icon: ShieldCheck, title: 'Insured Storage', desc: 'Your collateral is safe with us' },
    { icon: MapPin, title: 'Local Presence', desc: 'Visit any of our offices' },
  ];
  return (
    <section className="bg-[#F2F7FB]">
      <div className="mx-auto grid max-w-6xl gap-3 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((t) => (
          <div key={t.title} className="rounded-2xl bg-white p-5 shadow-sm">
            <t.icon size={24} className="text-[#00A6E0]" />
            <p className="mt-2 font-bold text-[#005BAC]">{t.title}</p>
            <p className="text-sm text-slate-600">{t.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CollateralGrid() {
  const items = [
    { icon: Car, title: 'Vehicles', desc: 'Cars, minibuses and motorbikes with papers' },
    { icon: Smartphone, title: 'Phones', desc: 'Smartphones in good working condition' },
    { icon: Tv, title: 'Electronics', desc: 'TVs, laptops, sound systems and more' },
    { icon: Refrigerator, title: 'Appliances', desc: 'Fridges, freezers, stoves, washers' },
    { icon: Briefcase, title: 'Business Equipment', desc: 'Tools and machines that earn' },
    { icon: Package, title: 'Other', desc: 'Ask us — if it holds value, it counts' },
  ];
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-extrabold text-[#005BAC]">What we accept</h2>
        <p className="mt-1 text-slate-600">Bring the asset, get a valuation, walk out with cash.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <div key={c.title} className="rounded-2xl border border-slate-200 p-5">
              <c.icon size={24} className="text-[#00A6E0]" />
              <p className="mt-2 font-bold text-[#005BAC]">{c.title}</p>
              <p className="text-sm text-slate-600">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    { n: 1, title: 'Apply online or visit an office', desc: 'Tell us how much you need and what you can pledge.' },
    { n: 2, title: 'Get your collateral valued', desc: 'Fair, transparent valuation in minutes.' },
    { n: 3, title: 'Receive cash same day', desc: 'Approved loans disburse the same day.' },
    { n: 4, title: 'Repay on your schedule', desc: 'Daily, weekly or monthly plans that fit.' },
  ];
  return (
    <section id="how" className="bg-[#F2F7FB]">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-extrabold text-[#005BAC]">How it works</h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="relative rounded-2xl bg-white p-5 shadow-sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00A6E0] text-base font-extrabold text-white">{s.n}</span>
              <p className="mt-3 font-bold text-[#005BAC]">{s.title}</p>
              <p className="mt-1 text-sm text-slate-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
