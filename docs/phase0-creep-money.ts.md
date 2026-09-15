# Scope Creep: src/lib/money.ts

## Classification: REAL_CODE_UNTESTED

This file contains 92 lines of financial arithmetic code that belongs
to Phase 3 (Lending Engine). It was created during Phase 0 without
unit tests. All financial code must be built with full test coverage
in Phase 3.

## Original Contents

```typescript
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

export function toNgwee(amount: Kwacha): Ngwee {
  return Math.round(amount * NGWEE_PER_KWACHA);
}

export function toKwacha(ngwee: Ngwee): Kwacha {
  return ngwee / NGWEE_PER_KWACHA;
}

export function formatKwacha(ngwee: Ngwee): string {
  const kwacha = toKwacha(ngwee);
  return `K ${kwacha.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseKwachaInput(input: string): Ngwee {
  const cleaned = input.replace(/[^0-9.\-]/g, '');
  const value = parseFloat(cleaned);
  if (isNaN(value)) return 0;
  return toNgwee(value);
}

export function addNgwee(a: Ngwee, b: Ngwee): Ngwee {
  return a + b;
}

export function subtractNgwee(a: Ngwee, b: Ngwee): Ngwee {
  return Math.max(0, a - b);
}

export function roundHalfUp(value: number): Kwacha {
  return Math.round(value * 100) / 100;
}

export function calcInstalmentResidual(
  total: Ngwee,
  count: number,
): { base: Ngwee; final: Ngwee } {
  const base = Math.floor(total / count);
  const final = total - base * (count - 1);
  return { base, final };
}
```

## Action
Stripped back to empty stub. Phase 3 will rebuild with full unit tests.
