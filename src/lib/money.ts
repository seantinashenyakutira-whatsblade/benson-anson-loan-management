/**
 * Money arithmetic — all calculations in integer minor units (ngwee).
 * This module is the SINGLE SOURCE of truth for financial math.
 *
 * Rules:
 * - All internal arithmetic in integer ngwee (K1 = 100 ngwee)
 * - Conversion to decimal Kwatcha only at display/persistence boundary
 * - Rounding: half-up to 2 decimal places
 * - Never use JavaScript floating point for money
 *
 * @module lib/money
 */

/** Amount in ngwee (integer minor units) */
export type Ngwee = number;

/** Amount in Kwatcha (decimal major units) — display only */
export type Kwacha = number;

const NGWEE_PER_KWACHA = 100;

/**
 * Convert Kwatcha (decimal) to ngwee (integer).
 * Uses Math.round to avoid floating-point drift.
 */
export function toNgwee(amount: Kwacha): Ngwee {
  return Math.round(amount * NGWEE_PER_KWACHA);
}

/**
 * Convert ngwee (integer) to Kwatcha (decimal).
 * For display and persistence only.
 */
export function toKwacha(ngwee: Ngwee): Kwacha {
  return ngwee / NGWEE_PER_KWACHA;
}

/**
 * Format ngwee as a display string: "K 1,000.00"
 */
export function formatKwacha(ngwee: Ngwee): string {
  const kwacha = toKwacha(ngwee);
  return `K ${kwacha.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Parse a Kwatcha string (e.g. "1000.00", "K 1,000.00") to ngwee.
 */
export function parseKwachaInput(input: string): Ngwee {
  const cleaned = input.replace(/[^0-9.\-]/g, '');
  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  return toNgwee(value);
}

/**
 * Add two ngwee values.
 */
export function addNgwee(a: Ngwee, b: Ngwee): Ngwee {
  return a + b;
}

/**
 * Subtract ngwee values. Result is clamped to 0 (no negative balances).
 */
export function subtractNgwee(a: Ngwee, b: Ngwee): Ngwee {
  return Math.max(0, a - b);
}

/**
 * Round half-up to 2 decimal places.
 * Used for splitting instalments.
 */
export function roundHalfUp(value: number): Kwacha {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate the rounding residual when splitting total into N instalments.
 * The final instalment absorbs this residual.
 */
export function calcInstalmentResidual(
  total: Ngwee,
  count: number,
): { base: Ngwee; final: Ngwee } {
  const base = Math.floor(total / count);
  const final = total - base * (count - 1);
  return { base, final };
}
