'use client';

import Link from 'next/link';
import { useApply } from '@/components/marketing/apply-provider';
import { Phone, Mail, MapPin, ArrowRight } from 'lucide-react';
import type { BusinessInfo } from './use-business';

export function LandingHeader() {
  const { open } = useApply();

  return (
    <header className="lp-header">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/logo.png" alt="Anson Benson Cash Solutions" style={{ height: 34, width: 'auto' }} />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <a href="#products" className="lp-nav-link">Products</a>
          <a href="#how" className="lp-nav-link">How it works</a>
          <a href="#locations" className="lp-nav-link">Locations</a>
          <a href="#contact" className="lp-nav-link">Contact</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-[#a0b4d0] transition-colors hover:text-white">
            Sign in
          </Link>
          <button onClick={open} className="lp-btn-gold text-sm">
            Apply Now
          </button>
        </div>
      </div>
    </header>
  );
}

export function LandingFooter({ info }: { info: BusinessInfo }) {
  return (
    <footer id="contact" className="lp-footer">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/logo.png" alt="Anson Benson Cash Solutions" style={{ height: 38, width: 'auto' }} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#a0b4d0]">
            Turn your needs into reality with Anson Benson Cash Solutions Limited — your
            trusted partner for fair, collateral-backed loans.
          </p>
        </div>

        <div>
          <h3 className="lp-eyebrow pb-1">Contact</h3>
          <div className="mt-3 space-y-2 text-sm text-[#a0b4d0]">
            {info.phone && (
              <p className="flex items-center gap-2">
                <Phone size={15} className="text-[#f5b300]" />
                <a href={`tel:${info.phone.replace(/\s/g, '')}`}>{info.phone}</a>
              </p>
            )}
            {info.email && (
              <p className="flex items-center gap-2">
                <Mail size={15} className="text-[#f5b300]" />
                <a href={`mailto:${info.email}`}>{info.email}</a>
              </p>
            )}
          </div>
        </div>

        <div id="locations">
          <h3 className="lp-eyebrow pb-1">Locations</h3>
          <div className="mt-3 space-y-2 text-sm text-[#a0b4d0]">
            {info.locations.length > 0 ? (
              info.locations.map((l) => (
                <p key={l} className="flex items-center gap-2">
                  <MapPin size={15} className="text-[#f5b300]" />
                  {l}
                </p>
              ))
            ) : (
              <p className="text-[#6b7f9e]">Find us at any of our offices across Zambia.</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="lp-eyebrow pb-1">Quick links</h3>
          <div className="mt-3 space-y-2 text-sm">
            <p>
              <Link href="/apply" className="inline-flex items-center gap-1.5">
                Apply for a loan <ArrowRight size={14} />
              </Link>
            </p>
            <p>
              <a href="#how" className="inline-flex items-center gap-1.5">
                How it works <ArrowRight size={14} />
              </a>
            </p>
            <p>
              <Link href="/login" className="inline-flex items-center gap-1.5">
                Staff sign in <ArrowRight size={14} />
              </Link>
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-[#ffffff10]">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-[#6b7f9e] sm:px-6">
          © 2026 Anson Benson Cash Solutions Limited. All rights reserved.
        </p>
      </div>
    </footer>
  );
}