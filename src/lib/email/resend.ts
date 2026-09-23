import { Resend } from 'resend';

let client: Resend | null = null;

export function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key || key === 're_temp_placeholder') return null;
  if (!client) client = new Resend(key);
  return client;
}

export function getFrom(): { email: string; name: string } {
  return {
    email: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    name: process.env.RESEND_FROM_NAME || 'Anson Benson Cash Solutions',
  };
}

export async function sendEmail(opts: { to: string; subject: string; html: string; text?: string }) {
  const resend = getResend();
  if (!resend) {
    return { id: null, skipped: true as const, reason: 'RESEND_API_KEY not configured' };
  }
  const from = getFrom();
  const { data, error } = await resend.emails.send({
    from: `${from.name} <${from.email}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (error) throw new Error(error.message);
  return { id: data?.id ?? null, skipped: false as const };
}
