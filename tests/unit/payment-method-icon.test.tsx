import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PaymentMethodIcon, normalizeMethod } from '@/components/payments/payment-method-icon';

describe('normalizeMethod', () => {
  it('maps canonical values', () => {
    expect(normalizeMethod('cash')).toBe('cash');
    expect(normalizeMethod('bank_transfer')).toBe('bank_transfer');
    expect(normalizeMethod('airtel_money')).toBe('airtel_money');
    expect(normalizeMethod('mtn_mobile_money')).toBe('mtn_mobile_money');
  });

  it('maps aliases case-insensitively', () => {
    expect(normalizeMethod('bank')).toBe('bank_transfer');
    expect(normalizeMethod('Airtel')).toBe('airtel_money');
    expect(normalizeMethod('MTN')).toBe('mtn_mobile_money');
    expect(normalizeMethod('mtn_momo')).toBe('mtn_mobile_money');
  });

  it('falls back to other', () => {
    expect(normalizeMethod('cheque')).toBe('other');
    expect(normalizeMethod('')).toBe('other');
  });
});

describe('PaymentMethodIcon', () => {
  it.each([
    ['cash', 'Cash'],
    ['bank_transfer', 'Bank transfer'],
    ['mtn_mobile_money', 'MTN Mobile Money'],
    ['airtel_money', 'Airtel Money'],
    ['cheque', 'Other'],
  ])('renders %s tile with title %s', (method, title) => {
    const { container } = render(<PaymentMethodIcon method={method} size={32} />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile.getAttribute('title')).toBe(title);
    expect(tile.style.width).toBe('32px');
    expect(tile.style.height).toBe('32px');
  });

  it('renders MTN fallback on brand-yellow tile', () => {
    const { container } = render(<PaymentMethodIcon method="mtn" />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile.getAttribute('title')).toBe('MTN Mobile Money');
    expect(tile.style.background).toBe('rgb(255, 204, 0)');
  });

  it('renders Airtel glyph in white on brand-red tile', () => {
    const { container } = render(<PaymentMethodIcon method="airtel_money" />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile.style.background).toBe('rgb(228, 0, 0)');
    const svg = tile.querySelector('svg');
    expect(svg?.getAttribute('fill')).toBe('#FFFFFF');
    expect(svg?.querySelector('path')?.getAttribute('d')?.length).toBeGreaterThan(100);
  });
});
