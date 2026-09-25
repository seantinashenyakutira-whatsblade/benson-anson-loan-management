import { Svg, Rect, Path } from '@react-pdf/renderer';
import { siAirtel } from 'simple-icons';
import { normalizeMethod } from '@/components/payments/payment-method-icon';

/** 24x24 coordinate space (Lucide + simple-icons both ship viewBox 0 0 24 24). */
const LUCIDE_NODES: Record<string, { d: string; stroke?: boolean }[]> = {
  cash: [
    { d: 'M2 6h20v12H2z', stroke: true },
    { d: 'M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0', stroke: true },
    { d: 'M6 12h.01M18 12h.01', stroke: true },
  ],
  bank_transfer: [
    { d: 'M10 18v-7', stroke: true },
    { d: 'M11.119 2.205a2 2 0 0 1 1.762 0l7.84 3.846A.5.5 0 0 1 20.5 7h-17a.5.5 0 0 1-.22-.949z', stroke: true },
    { d: 'M14 18v-7', stroke: true },
    { d: 'M18 18v-7', stroke: true },
    { d: 'M3 22h18', stroke: true },
    { d: 'M6 18v-7', stroke: true },
  ],
  mtn_mobile_money: [
    { d: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z', stroke: true },
    { d: 'M12 18h.01', stroke: true },
  ],
  other: [
    { d: 'M12 17V7', stroke: true },
    { d: 'M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8', stroke: true },
    { d: 'M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z', stroke: true },
  ],
};

const TILE: Record<string, { bg: string; fg: string }> = {
  cash: { bg: '#D9F7EC', fg: '#10B981' },
  bank_transfer: { bg: '#DCEAFE', fg: '#3B82F6' },
  mtn_mobile_money: { bg: '#FFCC00', fg: '#000000' },
  airtel_money: { bg: '#E40000', fg: '#FFFFFF' },
  other: { bg: '#E8EDF5', fg: '#6B7F9E' },
};

/**
 * Solid-fill method tile for react-pdf.
 * PDFs handle transparency poorly, so every tile is an opaque rect
 * (no rgba tints) and every glyph is a plain fill/stroke path.
 */
export function PaymentMethodPdfIcon({ method, size = 14 }: { method: string; size?: number }) {
  const m = normalizeMethod(method);
  const tile = TILE[m] ?? TILE.other;
  const glyph = m === 'airtel_money' ? null : LUCIDE_NODES[m];

  if (!tile) return null;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={0} y={0} width={24} height={24} rx={5} fill={tile.bg} />
      {m === 'airtel_money' ? (
        <Path d={siAirtel.path} fill={tile.fg} transform="translate(3 3) scale(0.75)" />
      ) : (
        glyph?.map((n, i) => (
          <Path
            key={i}
            d={n.d}
            fill="none"
            stroke={tile.fg}
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))
      )}
    </Svg>
  );
}
