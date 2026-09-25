import { describe, it, expect } from 'vitest';
import { renderToBuffer, Document, Page, View } from '@react-pdf/renderer';
import { createElement } from 'react';
import { PaymentMethodPdfIcon } from '@/components/payments/payment-method-pdf';

const METHODS = [
  'cash',
  'bank_transfer',
  'mtn_mobile_money',
  'airtel_money',
  'other',
  'bank transfer',
  'Airtel Money',
  'cheque',
];

describe('PaymentMethodPdfIcon', () => {
  it('renders every method (incl. aliases) into a valid PDF buffer', async () => {
    const doc = createElement(
      Document,
      null,
      createElement(
        Page,
        { size: 'A4' },
        createElement(
          View,
          { style: { flexDirection: 'row', padding: 20, gap: 10 } },
          ...METHODS.map((m) => createElement(PaymentMethodPdfIcon, { key: m, method: m, size: 24 }))
        )
      )
    );
    const buf = await renderToBuffer(doc);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('falls back to the other tile for unknown methods', async () => {
    const doc = createElement(
      Document,
      null,
      createElement(Page, { size: 'A4' }, createElement(PaymentMethodPdfIcon, { method: 'crypto' }))
    );
    const buf = await renderToBuffer(doc);
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
