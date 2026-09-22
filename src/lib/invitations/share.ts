import QRCode from 'qrcode';

/** Absolute invite URL from the RPC path (/onboard/<token>). */
export function buildInviteUrl(origin: string, path: string): string {
  return `${origin.replace(/\/$/, '')}${path}`;
}

export function inviteMessage(url: string, customerName?: string | null): string {
  const who = customerName?.trim() ? ` for ${customerName.trim()}` : '';
  return `Anson Benson Cash Solutions loan application${who}: ${url}`;
}

export function waShareLink(url: string, customerName?: string | null): string {
  return `https://wa.me/?text=${encodeURIComponent(inviteMessage(url, customerName))}`;
}

export function smsLink(url: string, customerName?: string | null): string {
  return `sms:?body=${encodeURIComponent(inviteMessage(url, customerName))}`;
}

export function mailtoLink(url: string, customerName?: string | null): string {
  return `mailto:?subject=${encodeURIComponent('Loan application — Anson Benson')}&body=${encodeURIComponent(inviteMessage(url, customerName))}`;
}

export function shortToken(token: string): string {
  return token.length > 12 ? `${token.slice(0, 8)}…` : token;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  submitted: 'Submitted',
  approved: 'Approved',
  rejected: 'Rejected',
  expired: 'Expired',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/** PNG data URL for the QR code (used inline + for download). */
export async function qrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 256, margin: 1 });
}
