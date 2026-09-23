export interface PaymentReceivedPayload {
  customer_name: string;
  loan_no: string;
  amount: number;
  method: string;
  receipt_no: string;
  new_balance: number;
  paid_at: string;
  business_name?: string;
}

export function paymentReceived(payload: PaymentReceivedPayload) {
  const business = payload.business_name || 'Anson Benson Cash Solutions';
  const amount = `K${Number(payload.amount).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;
  const balance = `K${Number(payload.new_balance).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;
  const subject = `Payment received — ${amount} for ${payload.loan_no}`;
  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb">
  <tr><td style="background:#0A1834;padding:20px;text-align:center;color:#ffffff"><h1 style="margin:0;font-size:18px">${business}</h1><p style="margin:4px 0 0;font-size:12px;color:#C8B6F0">Payment Confirmation</p></td></tr>
  <tr><td style="padding:24px">
    <p style="margin:0 0 12px;font-size:14px;color:#111827">Hi ${payload.customer_name},</p>
    <p style="margin:0 0 16px;font-size:14px;color:#374151">We received your payment of <strong>${amount}</strong> via ${payload.method} for loan <strong>${payload.loan_no}</strong> on ${new Date(payload.paid_at).toLocaleDateString('en-ZM')}.</p>
    <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin:16px 0">
      <tr style="background:#f9fafb"><td style="border:1px solid #e5e7eb;font-size:13px">Receipt</td><td style="border:1px solid #e5e7eb;font-size:13px">${payload.receipt_no}</td></tr>
      <tr><td style="border:1px solid #e5e7eb;font-size:13px">Amount paid</td><td style="border:1px solid #e5e7eb;font-size:13px">${amount}</td></tr>
      <tr style="background:#f9fafb"><td style="border:1px solid #e5e7eb;font-size:13px">New balance</td><td style="border:1px solid #e5e7eb;font-size:13px">${balance}</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:12px;color:#6b7280">Thank you for your payment. Contact us if you have questions.</p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:12px;text-align:center;font-size:11px;color:#9ca3af">${business} • Lusaka, Zambia</td></tr>
</table>`;
  const text = `Hi ${payload.customer_name},\nWe received ${amount} via ${payload.method} for ${payload.loan_no} on ${payload.paid_at}. Receipt ${payload.receipt_no}. New balance ${balance}.\n— ${business}`;
  return { subject, html, text };
}
