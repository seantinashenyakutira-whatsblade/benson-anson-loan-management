export interface LoanApprovedPayload {
  customer_name: string;
  loan_no: string;
  amount: number;
  business_name?: string;
}

export function loanApproved(payload: LoanApprovedPayload) {
  const business = payload.business_name || 'Anson Benson Cash Solutions';
  const amount = `K${Number(payload.amount).toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;
  const subject = `Loan approved — ${payload.loan_no} for ${amount}`;
  const html = `
<table width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb">
  <tr><td style="background:#0A1834;padding:20px;text-align:center;color:#ffffff"><h1 style="margin:0;font-size:18px">${business}</h1><p style="margin:4px 0 0;font-size:12px;color:#C8B6F0">Loan Approved</p></td></tr>
  <tr><td style="padding:24px">
    <p style="margin:0 0 12px;font-size:14px;color:#111827">Hi ${payload.customer_name},</p>
    <p style="margin:0;font-size:14px;color:#374151">Great news — your loan <strong>${payload.loan_no}</strong> for <strong>${amount}</strong> has been approved. Visit your branch to complete disbursement.</p>
  </td></tr>
  <tr><td style="background:#f9fafb;padding:12px;text-align:center;font-size:11px;color:#9ca3af">${business}</td></tr>
</table>`;
  const text = `Hi ${payload.customer_name}, your loan ${payload.loan_no} for ${amount} has been approved.\n— ${business}`;
  return { subject, html, text };
}
