/**
 * Money arithmetic — single source of truth for financial math.
 * ALL financial arithmetic uses integer minor units (ngwee, K1 = 100).
 * Database NUMERIC(18,2) stores kwacha; this module converts to/from ngwee.
 *
 * @module lib/money
 */

/** Amount in ngwee (minor units). K1 = 100 ngwee. */
export type Ngwee = number;

/** Amount in kwacha (major units). K1 = 1.00. */
export type Kwacha = number;

const NGWEE_PER_KWACHA = 100;

// ── Conversion ──────────────────────────────────────────────

/** Convert kwacha (e.g. 1500.50) to ngwee (150050). Half-up rounding. */
export function toNgwee(kwacha: Kwacha): Ngwee {
  return Math.round(kwacha * NGWEE_PER_KWACHA);
}

/** Convert ngwee (e.g. 150050) to kwacha (1500.50). */
export function toKwacha(ngwee: Ngwee): Kwacha {
  return ngwee / NGWEE_PER_KWACHA;
}

/** Format kwacha as "K 1,500.50" with thousand separators. */
export function formatKwacha(kwacha: Kwacha): string {
  const abs = Math.abs(kwacha);
  const formatted = abs.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return kwacha < 0 ? `-K ${formatted}` : `K ${formatted}`;
}

/** Format kwacha for display without currency symbol: "1,500.50". */
export function formatNumber(kwacha: Kwacha): string {
  const abs = Math.abs(kwacha);
  const formatted = abs.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return kwacha < 0 ? `-${formatted}` : formatted;
}

// ── Arithmetic (all in ngwee to avoid float drift) ──────────

/** Add two kwacha amounts. Operates in ngwee internally. */
export function add(a: Kwacha, b: Kwacha): Kwacha {
  return toKwacha(toNgwee(a) + toNgwee(b));
}

/** Subtract b from a. Operates in ngwee internally. */
export function subtract(a: Kwacha, b: Kwacha): Kwacha {
  return toKwacha(toNgwee(a) - toNgwee(b));
}

/** Multiply kwacha by a scalar (e.g. rate). Result rounded half-up. */
export function multiply(kwacha: Kwacha, factor: number): Kwacha {
  return toKwacha(Math.round(toNgwee(kwacha) * factor));
}

/** Negate a kwacha amount. */
export function negate(kwacha: Kwacha): Kwacha {
  return -kwacha;
}

/** Absolute value of a kwacha amount. */
export function abs(kwacha: Kwacha): Kwacha {
  return Math.abs(kwacha);
}

/** Maximum of two kwacha amounts. */
export function max(a: Kwacha, b: Kwacha): Kwacha {
  return Math.max(a, b);
}

/** Minimum of two kwacha amounts. */
export function min(a: Kwacha, b: Kwacha): Kwacha {
  return Math.min(a, b);
}

/** Check if two kwacha amounts are equal (within 0.005 tolerance). */
export function eq(a: Kwacha, b: Kwacha): boolean {
  return Math.abs(a - b) < 0.005;
}

/** Check if a > b (within 0.005 tolerance). */
export function gt(a: Kwacha, b: Kwacha): boolean {
  return a - b > 0.005;
}

/** Check if a >= b (within 0.005 tolerance). */
export function gte(a: Kwacha, b: Kwacha): boolean {
  return a - b > -0.005;
}

/** Check if a < b (within 0.005 tolerance). */
export function lt(a: Kwacha, b: Kwacha): boolean {
  return b - a > 0.005;
}

/** Check if a <= b (within 0.005 tolerance). */
export function lte(a: Kwacha, b: Kwacha): boolean {
  return b - a > -0.005;
}

/** Check if amount is zero (within 0.005 tolerance). */
export function isZero(kwacha: Kwacha): boolean {
  return Math.abs(kwacha) < 0.005;
}

/** Check if amount is positive. */
export function isPositive(kwacha: Kwacha): boolean {
  return kwacha > 0.005;
}

/** Check if amount is negative. */
export function isNegative(kwacha: Kwacha): boolean {
  return kwacha < -0.005;
}

/** Split kwacha into integer and fractional parts for display. */
export function splitAmount(kwacha: Kwacha): { integer: number; fractional: number } {
  const abs = Math.abs(kwacha);
  return {
    integer: Math.floor(abs),
    fractional: Math.round((abs - Math.floor(abs)) * NGWEE_PER_KWACHA),
  };
}
