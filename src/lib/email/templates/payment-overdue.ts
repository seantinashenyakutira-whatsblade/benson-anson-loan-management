export interface PaymentOverduePayload {
  customer_name: string;
  loan_no: string;
  due_date: string;
  amount_due: number;
  days_overdue: number;
  business_name?: string;
  business_phone?: string;
}

export function paymentOverdue(payload: PaymentOverduePayload) {
  const business = payload.business_name || 'Anson Benson Cash Solutions';
  const phone = payload.business_phone || '+260 977 000001';
  const amount = `K${Number(payload.amount_due).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;
  const subject = `Overdue payment — ${payload.loan_no} is ${payload.days_overdue} days overdue`;
  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb">
  <tr><td style="background:#7f1d1d;padding:20px;text-align:center;color:#ffffff"><h1 style="margin:0;font-size:18px">${business}</h1><p style="margin:4px 0 0;font-size:12px;color:#fecaca">Overdue Notice</p></td></tr>
  <tr><td style="padding:24px">
    <p style="margin:0 0 12px;font-size:14px;color:#111827">Hi ${payload.customer_name},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151">Your payment for loan <strong>${payload.loan_no}</strong> was due on ${new Date(payload.due_date).toLocaleDateString('en-ZM')} and is now <strong>${payload.days_overdue} days overdue</strong>. Amount due: <strong>${amount}</strong>.</p>
    <p style="margin:0;font-size:14px;color:#374151">Please visit any branch or contact us at ${phone} to clear this promptly and avoid additional penalties.</p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:12px;text-align:center;font-size:11px;color:#9ca3af">${business} • ${phone}</td></tr>
</table>`;
  const text = `Hi ${payload.customer_name}, your payment for ${payload.loan_no} due ${payload.due_date} is ${payload.days_overdue} days overdue. Amount due ${amount}. Contact ${phone}.\n— ${business}`;
  return { subject, html, text };
}
