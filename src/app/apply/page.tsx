'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { BrandMark } from '@/components/layout/brand-mark';
import { CheckCircle, MessageCircle } from 'lucide-react';
import { useBusinessInfo, buildWhatsAppUrl } from '@/app/(marketing)/components/use-business';

const COLLATERAL_TYPES = ['Vehicle', 'Phone', 'Laptop', 'TV / Monitor', 'Fridge / Freezer', 'Washing Machine', 'Sound System', 'Business Equipment', 'Other'];

export default function ApplyPage() {
  const info = useBusinessInfo();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    amount_requested: '',
    collateral_type: '',
    notes: '',
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.phone.trim()) {
      setError('Name and phone are required.');
      return;
    }
    setLoading(true);
    setError('');

    const supabase = createClient();
    const { error: insertErr } = await supabase.from('leads').insert({
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      amount_requested: form.amount_requested ? Number(form.amount_requested) : null,
      collateral_type: form.collateral_type || null,
      notes: form.notes.trim() || null,
      source: 'web',
    });

    setLoading(false);
    if (insertErr) {
      setError('Something went wrong. Please try again or call us.');
    } else {
      setSubmitted(true);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white p-4">
        <div className="w-full max-w-md text-center">
          <CheckCircle size={48} className="mx-auto text-green-500" />
          <h1 className="mt-4 text-2xl font-extrabold text-[#005BAC]">Application received!</h1>
          <p className="mt-2 text-slate-600">Our team will reach out within 24 hours to guide you through the next steps.</p>
          <Link href="/" className="mt-6 inline-block rounded-xl bg-[#00A6E0] px-6 py-3 font-bold text-white hover:brightness-95">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#F2F7FB]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-2xl items-center px-4">
          <Link href="/"><BrandMark variant="full" height={28} /></Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-extrabold text-[#005BAC]">Apply for a loan</h1>
        <p className="mt-1 text-sm text-slate-600">Fill in the details below and we will get back to you within 24 hours.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Full name *</label>
            <input
              required
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#00A6E0] focus:outline-none focus:ring-1 focus:ring-[#00A6E0]"
              placeholder="e.g. Grace Mwanza"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone *</label>
              <input
                required
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#00A6E0] focus:outline-none focus:ring-1 focus:ring-[#00A6E0]"
                placeholder="09XX XXX XXX"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#00A6E0] focus:outline-none focus:ring-1 focus:ring-[#00A6E0]"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Amount needed (ZMW)</label>
              <input
                type="number"
                min={0}
                value={form.amount_requested}
                onChange={(e) => set('amount_requested', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#00A6E0] focus:outline-none focus:ring-1 focus:ring-[#00A6E0]"
                placeholder="5000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Collateral type</label>
              <select
                value={form.collateral_type}
                onChange={(e) => set('collateral_type', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#00A6E0] focus:outline-none focus:ring-1 focus:ring-[#00A6E0]"
              >
                <option value="">Select…</option>
                {COLLATERAL_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Additional notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:border-[#00A6E0] focus:outline-none focus:ring-1 focus:ring-[#00A6E0]"
              placeholder="Anything we should know? (model, year, condition, etc.)"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#00A6E0] py-3 text-sm font-bold text-white hover:brightness-95 disabled:opacity-60"
          >
            {loading ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Already a client? <Link href="/login" className="text-[#005BAC] underline">Sign in here</Link>
        </p>
      </main>

      <a
        href={buildWhatsAppUrl(info.whatsappNumber)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-[0_10px_28px_-8px_rgba(37,211,102,0.6)] transition-transform hover:-translate-y-0.5 hover:scale-105"
      >
        <MessageCircle size={26} />
      </a>
    </div>
  );
}
