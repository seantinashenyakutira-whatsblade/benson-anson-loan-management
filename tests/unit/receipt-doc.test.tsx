import { describe, it, expect } from 'vitest';
import { renderReceiptPdf, type ReceiptDocProps } from '@/components/pdf/ReceiptDoc';

const base: ReceiptDocProps = {
  receiptNo: 'PY001138',
  paidAt: '2026-11-02T09:15:00.000Z',
  amount: 1035.5,
  method: 'mtn_mobile_money',
  reference: 'MP261102.1',
  status: 'verified',
  customerName: 'Winnie Bwalya',
  nrc: '123456/78/9',
  loanNumber: 'LN01016',
  outstandingBalance: 2204.5,
  nextDueDate: '2026-11-15',
  amountDueToDate: 350,
  arrears: 350,
  recordedByName: 'Grace Mwanza',
  businessName: 'Anson Benson Cash Solutions Limited',
  businessPhone: '+260 211 250000',
  businessEmail: 'info@bensonanson.loans',
  logoDataUri: null,
  generatedAt: '2026-11-02T10:00:00.000Z',
};

describe('renderReceiptPdf', () => {
  it('produces a valid PDF buffer', async () => {
    const buf = await renderReceiptPdf(base);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('handles every method + missing optional fields', async () => {
    for (const method of ['cash', 'bank_transfer', 'airtel_money', 'mtn_mobile_money', 'other', 'weird_value']) {
      const buf = await renderReceiptPdf({
        ...base,
        method,
        reference: null,
        nrc: null,
        nextDueDate: null,
      });
      expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
    }
  });

  it('handles a null logo data uri', async () => {
    const buf = await renderReceiptPdf({ ...base, logoDataUri: null });
    expect(buf.length).toBeGreaterThan(1000);
  });
});
