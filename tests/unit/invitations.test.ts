import { describe, it, expect } from 'vitest';
import {
  buildInviteUrl,
  inviteMessage,
  mailtoLink,
  qrDataUrl,
  shortToken,
  smsLink,
  statusLabel,
  waShareLink,
} from '@/lib/invitations/share';
import { canAccessRoute, visibleNav } from '@/lib/permissions';

describe('invitation share links', () => {
  const url = 'https://app.example/onboard/abc123TOKEN';

  it('builds absolute URLs without double slashes', () => {
    expect(buildInviteUrl('https://app.example/', '/onboard/abc')).toBe('https://app.example/onboard/abc');
    expect(buildInviteUrl('https://app.example', '/onboard/abc')).toBe('https://app.example/onboard/abc');
  });

  it('builds wa.me / sms / mailto links with the message', () => {
    expect(waShareLink(url, 'Jane')).toContain('https://wa.me/?text=');
    expect(decodeURIComponent(waShareLink(url, 'Jane'))).toContain(url);
    expect(smsLink(url)).toMatch(/^sms:\?body=/);
    expect(mailtoLink(url)).toMatch(/^mailto:\?subject=/);
  });

  it('mentions the customer name when given', () => {
    expect(inviteMessage(url, 'Jane')).toContain('for Jane');
    expect(inviteMessage(url, null)).not.toContain('for ');
  });

  it('truncates tokens and labels statuses', () => {
    expect(shortToken('abcdefghijklmnop')).toBe('abcdefgh…');
    expect(shortToken('short')).toBe('short');
    expect(statusLabel('submitted')).toBe('Submitted');
    expect(statusLabel('weird')).toBe('weird');
  });

  it('renders a QR data URL', async () => {
    const qr = await qrDataUrl(url);
    expect(qr.startsWith('data:image/png;base64,')).toBe(true);
  });
});

describe('invitations route access', () => {
  it('allows owner, BM and officer; denies cashier and guests', () => {
    expect(canAccessRoute('owner', '/invitations')).toBe(true);
    expect(canAccessRoute('owner', '/invitations/123')).toBe(true);
    expect(canAccessRoute('branch_manager', '/invitations')).toBe(true);
    expect(canAccessRoute('loan_officer', '/invitations')).toBe(true);
    expect(canAccessRoute('cashier', '/invitations')).toBe(false);
    expect(canAccessRoute(null, '/invitations')).toBe(false);
  });

  it('shows invitations in the sidebar for staff, not cashier', () => {
    expect(visibleNav('owner')).toContain('all');
    expect(visibleNav('branch_manager')).toContain('invitations');
    expect(visibleNav('loan_officer')).toContain('invitations');
    expect(visibleNav('cashier')).not.toContain('invitations');
  });
});
