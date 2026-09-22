'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Download, Mail, MessageCircle, Smartphone } from 'lucide-react';
import {
  buildInviteUrl,
  mailtoLink,
  qrDataUrl,
  smsLink,
  waShareLink,
} from '@/lib/invitations/share';

export function ShareBox({ token, path, customerName }: { token: string; path: string; customerName?: string | null }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fullUrl = buildInviteUrl(typeof window !== 'undefined' ? window.location.origin : '', path);

  useEffect(() => {
    let live = true;
    qrDataUrl(fullUrl).then((d) => {
      if (live) setQr(d);
    });
    return () => {
      live = false;
    };
  }, [fullUrl]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copy failed — long-press the link to copy it.');
    }
  }

  return (
    <div>
      <p className="break-all font-mono text-xs text-accent-primary">{fullUrl}</p>
      {qr && (
        <div className="mt-4 flex justify-center rounded-xl bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Invitation QR code" width={220} height={220} />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <button onClick={copy} className="flex items-center justify-center gap-1 rounded-[var(--radius-button)] bg-accent-primary px-3 py-2.5 font-medium text-accent-on-primary">
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy Link'}
        </button>
        {qr && (
          <a href={qr} download={`invite-${token.slice(0, 8)}.png`} className="flex items-center justify-center gap-1 rounded-[var(--radius-button)] border border-border-subtle px-3 py-2.5 text-text-secondary">
            <Download size={15} /> QR PNG
          </a>
        )}
        <a href={waShareLink(fullUrl, customerName)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 rounded-[var(--radius-button)] border border-border-subtle px-3 py-2.5 text-text-secondary">
          <MessageCircle size={15} /> WhatsApp
        </a>
        <a href={smsLink(fullUrl, customerName)} className="flex items-center justify-center gap-1 rounded-[var(--radius-button)] border border-border-subtle px-3 py-2.5 text-text-secondary">
          <Smartphone size={15} /> SMS
        </a>
        <a href={mailtoLink(fullUrl, customerName)} className="col-span-2 flex items-center justify-center gap-1 rounded-[var(--radius-button)] border border-border-subtle px-3 py-2.5 text-text-secondary">
          <Mail size={15} /> Email
        </a>
      </div>
    </div>
  );
}
