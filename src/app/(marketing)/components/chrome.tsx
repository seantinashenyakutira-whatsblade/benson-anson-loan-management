import Link from 'next/link';
import { BrandMark } from '@/components/layout/brand-mark';

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark variant="full" height={32} />
          <span className="hidden text-sm font-bold text-[#005BAC] sm:block">Anson Benson Cash Solutions</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-slate-600 md:flex">
          <a href="#products" className="hover:text-[#005BAC]">Products</a>
          <a href="#how" className="hover:text-[#005BAC]">How it works</a>
          <a href="#locations" className="hover:text-[#005BAC]">Locations</a>
          <a href="#contact" className="hover:text-[#005BAC]">Contact</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-[#005BAC]">
            Sign in
          </Link>
          <Link href="/apply" className="rounded-xl bg-[#F5B300] px-4 py-2 text-sm font-bold text-[#061633] hover:brightness-95">
            Apply Now
          </Link>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter({ info }: { info: { name: string; phone: string; email: string; whatsapp: string; locations: string[] } }) {
  return (
    <footer id="contact" className="bg-[#061633] text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <BrandMark variant="full" height={36} />
          <p className="mt-3 text-sm text-slate-300">Fast, fair loans against the assets you already own.</p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Contact</h3>
          {info.phone && <p className="text-sm text-slate-200">📞 {info.phone}</p>}
          {info.email && <p className="mt-1 text-sm text-slate-200">✉️ {info.email}</p>}
          {info.whatsapp && <p className="mt-1 text-sm text-slate-200">💬 WhatsApp: {info.whatsapp}</p>}
        </div>
        <div id="locations">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Locations</h3>
          {info.locations.map((l) => (
            <p key={l} className="text-sm text-slate-200">📍 {l}</p>
          ))}
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-400">Quick Links</h3>
          <p><Link href="/apply" className="text-sm text-slate-200 hover:text-white">Apply for a loan</Link></p>
          <p className="mt-1"><a href="#how" className="text-sm text-slate-200 hover:text-white">How it works</a></p>
          <p className="mt-1"><Link href="/login" className="text-sm text-slate-200 hover:text-white">Staff sign in</Link></p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-4 py-4 text-xs text-slate-400">© 2026 Anson Benson Cash Solutions Limited. All rights reserved.</p>
      </div>
    </footer>
  );
}
