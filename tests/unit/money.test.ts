import { describe, it, expect } from 'vitest';
import {
  toNgwee,
  toKwacha,
  formatKwacha,
  formatNumber,
  add,
  subtract,
  multiply,
  negate,
  abs,
  max,
  min,
  eq,
  gt,
  gte,
  lt,
  lte,
  isZero,
  isPositive,
  isNegative,
  splitAmount,
} from '@/lib/money';

describe('money', () => {
  describe('toNgwee', () => {
    it('converts kwacha to ngwee', () => {
      expect(toNgwee(1)).toBe(100);
      expect(toNgwee(10.50)).toBe(1050);
      expect(toNgwee(0.01)).toBe(1);
      expect(toNgwee(0.005)).toBe(1); // half-up
    });

    it('handles negative amounts', () => {
      expect(toNgwee(-5)).toBe(-500);
    });

    it('handles zero', () => {
      expect(toNgwee(0)).toBe(0);
    });
  });

  describe('toKwacha', () => {
    it('converts ngwee to kwacha', () => {
      expect(toKwacha(100)).toBe(1);
      expect(toKwacha(1050)).toBe(10.5);
      expect(toKwacha(1)).toBe(0.01);
    });

    it('handles negative amounts', () => {
      expect(toKwacha(-500)).toBe(-5);
    });
  });

  describe('formatKwacha', () => {
    it('formats positive amount', () => {
      expect(formatKwacha(1500.50)).toBe('K 1,500.50');
    });

    it('formats negative amount', () => {
      expect(formatKwacha(-1500.50)).toBe('-K 1,500.50');
    });

    it('formats zero', () => {
      expect(formatKwacha(0)).toBe('K 0.00');
    });
  });

  describe('formatNumber', () => {
    it('formats without currency symbol', () => {
      expect(formatNumber(1500.50)).toBe('1,500.50');
    });
  });

  describe('arithmetic', () => {
    it('adds two amounts', () => {
      expect(add(10.50, 20.30)).toBe(30.80);
    });

    it('subtracts two amounts', () => {
      expect(subtract(50.00, 20.30)).toBe(29.70);
    });

    it('multiplies by factor', () => {
      expect(multiply(100, 0.25)).toBe(25);
    });

    it('negates amount', () => {
      expect(negate(10)).toBe(-10);
      expect(negate(-10)).toBe(10);
    });

    it('takes absolute value', () => {
      expect(abs(-10)).toBe(10);
      expect(abs(10)).toBe(10);
    });

    it('returns max', () => {
      expect(max(10, 20)).toBe(20);
    });

    it('returns min', () => {
      expect(min(10, 20)).toBe(10);
    });
  });

  describe('comparison', () => {
    it('eq compares equal amounts', () => {
      expect(eq(10, 10)).toBe(true);
      expect(eq(10, 10.001)).toBe(true); // within tolerance
      expect(eq(10, 11)).toBe(false);
    });

    it('gt compares greater than', () => {
      expect(gt(10, 5)).toBe(true);
      expect(gt(5, 10)).toBe(false);
      expect(gt(10, 10)).toBe(false);
    });

    it('gte compares greater or equal', () => {
      expect(gte(10, 5)).toBe(true);
      expect(gte(10, 10)).toBe(true);
      expect(gte(5, 10)).toBe(false);
    });

    it('lt compares less than', () => {
      expect(lt(5, 10)).toBe(true);
      expect(lt(10, 5)).toBe(false);
      expect(lt(10, 10)).toBe(false);
    });

    it('lte compares less or equal', () => {
      expect(lte(5, 10)).toBe(true);
      expect(lte(10, 10)).toBe(true);
      expect(lte(10, 5)).toBe(false);
    });

    it('isZero checks zero', () => {
      expect(isZero(0)).toBe(true);
      expect(isZero(0.001)).toBe(true); // within tolerance
      expect(isZero(1)).toBe(false);
    });

    it('isPositive checks positive', () => {
      expect(isPositive(1)).toBe(true);
      expect(isPositive(0)).toBe(false);
      expect(isPositive(-1)).toBe(false);
    });

    it('isNegative checks negative', () => {
      expect(isNegative(-1)).toBe(true);
      expect(isNegative(0)).toBe(false);
      expect(isNegative(1)).toBe(false);
    });
  });

  describe('splitAmount', () => {
    it('splits into integer and fractional', () => {
      expect(splitAmount(1500.50)).toEqual({ integer: 1500, fractional: 50 });
    });

    it('handles whole numbers', () => {
      expect(splitAmount(100)).toEqual({ integer: 100, fractional: 0 });
    });
  });
});
