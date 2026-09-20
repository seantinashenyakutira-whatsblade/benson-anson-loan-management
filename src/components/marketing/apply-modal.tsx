'use client';

import { useEffect } from 'react';
import { X, Phone, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useBusinessInfo, buildWhatsAppUrl } from '@/app/(marketing)/components/use-business';

/**
 * "How would you like to proceed?" modal (Stage 2.5 Fix C).
 * Mobile: bottom sheet. Desktop: centred 480px.
 * Dismissible via ESC, backdrop click, or the X button.
 */
export function ApplyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { phone, whatsappNumber } = useBusinessInfo();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.getElementById('lp-call-btn')?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const tel = `tel:${phone.replace(/\s/g, '')}`;

  return (
    <>
      <div className="lp-modal-backdrop" onClick={onClose} aria-hidden />
      <div
        className="lp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lp-modal-title"
      >
        <button className="lp-modal-close" onClick={onClose} aria-label="Close" title="Close">
          <X size={20} />
        </button>

        <div className="px-1 pt-2">
          <h2 id="lp-modal-title" className="lp-h2 text-lg sm:text-xl">
            How would you like to <em className="lp-keyword">proceed</em>?
          </h2>
          <p className="mt-1.5 text-sm text-[#a0b4d0]">
            We typically respond within 15 minutes during business hours.
          </p>

          <div className="mt-5 space-y-3">
            <a id="lp-call-btn" href={tel} className="lp-wa-btn bg-[#00a6e0] text-white">
              <Phone size={18} />
              Call us now
            </a>
            <a
              href={buildWhatsAppUrl(whatsappNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="lp-wa-btn bg-[#25d366] text-white"
            >
              <MessageCircle size={18} />
              WhatsApp us
            </a>
          </div>

          <div className="mt-4 text-center text-sm">
            <Link href="/apply" onClick={onClose} className="text-[#a0b4d0] underline-offset-4 hover:text-[#f5b300] hover:underline">
              Or complete the online form
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}