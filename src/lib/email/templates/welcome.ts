export interface WelcomePayload {
  customer_name: string;
  business_name?: string;
}

export function welcome(payload: WelcomePayload) {
  const business = payload.business_name || 'Anson Benson Cash Solutions';
  const subject = `Welcome to ${business}`;
  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb">
  <tr><td style="background:#0A1834;padding:20px;text-align:center;color:#ffffff"><h1 style="margin:0;font-size:18px">${business}</h1></td></tr>
  <tr><td style="padding:24px">
    <p style="margin:0 0 12px;font-size:14px;color:#111827">Hi ${payload.customer_name},</p>
    <p style="margin:0;font-size:14px;color:#374151">Welcome to ${business}. Your account is now active. You can track your loans, repayments and collateral in one place.</p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:12px;text-align:center;font-size:11px;color:#9ca3af">${business}</td></tr>
</table>`;
  const text = `Hi ${payload.customer_name}, welcome to ${business}!\n— ${business}`;
  return { subject, html, text };
}
