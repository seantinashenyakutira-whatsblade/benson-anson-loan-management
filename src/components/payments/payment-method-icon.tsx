import { Banknote, Landmark, Receipt, Smartphone } from 'lucide-react';
import { siAirtel } from 'simple-icons';

export type Method = 'cash' | 'bank_transfer' | 'airtel_money' | 'mtn_mobile_money' | 'other';

const ALIASES: Record<string, Method> = {
  cash: 'cash',
  bank: 'bank_transfer',
  bank_transfer: 'bank_transfer',
  airtel: 'airtel_money',
  airtel_money: 'airtel_money',
  mtn: 'mtn_mobile_money',
  mtn_momo: 'mtn_mobile_money',
  mtn_mobile_money: 'mtn_mobile_money',
};

/** Map inconsistent DB values onto the canonical Method union. */
export function normalizeMethod(raw: string): Method {
  return ALIASES[raw?.toLowerCase().trim().replace(/\s+/g, '_')] ?? 'other';
}

function BrandGlyph({ d, color }: { d: string; color: string }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill={color} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/**
 * 32px method tile. MTN uses the solid brand-yellow fallback tile
 * (simple-icons has no siMtn); Airtel renders the real brand glyph
 * in white on brand red — never inverted.
 */
export function PaymentMethodIcon({ method, size = 32 }: { method: string; size?: number }) {
  const m = normalizeMethod(method);
  const tile = 'flex shrink-0 items-center justify-center rounded-lg';
  const style = { width: size, height: size } as const;

  if (m === 'cash') {
    return (
      <span className={tile} style={{ ...style, background: 'rgba(16,185,129,0.15)' }} title="Cash">
        <Banknote size={18} className="text-success" />
      </span>
    );
  }
  if (m === 'bank_transfer') {
    return (
      <span className={tile} style={{ ...style, background: 'rgba(59,130,246,0.15)' }} title="Bank transfer">
        <Landmark size={18} className="text-info" />
      </span>
    );
  }
  if (m === 'mtn_mobile_money') {
    return (
      <span
        className={`${tile} relative`}
        style={{ ...style, background: '#FFCC00', color: '#000000' }}
        title="MTN Mobile Money"
      >
        <img
          src="/branding/payments/mtn.svg"
          alt=""
          aria-hidden="true"
          style={{ width: Math.round(size * 0.6), height: 'auto', filter: 'brightness(0)' }}
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = 'none';
            const fb = img.nextElementSibling as HTMLElement | null;
            if (fb) fb.style.display = 'inline-flex';
          }}
        />
        <span data-mtn-fallback style={{ display: 'none' }}>
          <Smartphone size={18} color="#000000" stroke="currentColor" />
        </span>
      </span>
    );
  }
  if (m === 'airtel_money') {
    return (
      <span className={tile} style={{ ...style, background: '#E40000' }} title="Airtel Money">
        <BrandGlyph d={siAirtel.path} color="#FFFFFF" />
      </span>
    );
  }
  return (
    <span className={tile} style={{ ...style, background: 'var(--surface-glass-2)' }} title="Other">
      <Receipt size={18} className="text-text-muted" />
    </span>
  );
}
