import { describe, it, expect } from 'vitest';
import {
  calculatePosition,
  calculateDaysOverdue,
  calculateArrears,
  calculateCollectionEfficiency,
  calculatePAR,
} from '@/lib/loan/position';

describe('position', () => {
  describe('calculatePosition', () => {
    it('calculates performing position', () => {
      const result = calculatePosition({
        totalRepayable: 26000,
        amountPaid: 26000,
        arrears: 0,
        daysOverdue: 0,
        gracePeriodDays: 3,
        defaultAfterDays: 30,
      });

      expect(result.health).toBe('performing');
      expect(result.outstandingBalance).toBe(0);
      expect(result.percentPaid).toBe(100);
    });

    it('calculates at_risk position', () => {
      const result = calculatePosition({
        totalRepayable: 26000,
        amountPaid: 8667,
        arrears: 4600,
        daysOverdue: 2,
        gracePeriodDays: 3,
        defaultAfterDays: 30,
      });

      expect(result.health).toBe('at_risk');
    });

    it('calculates overdue position', () => {
      const result = calculatePosition({
        totalRepayable: 32500,
        amountPaid: 15000,
        arrears: 17500,
        daysOverdue: 15,
        gracePeriodDays: 3,
        defaultAfterDays: 30,
      });

      expect(result.health).toBe('overdue');
    });

    it('calculates defaulted position', () => {
      const result = calculatePosition({
        totalRepayable: 23400,
        amountPaid: 12000,
        arrears: 11400,
        daysOverdue: 45,
        gracePeriodDays: 3,
        defaultAfterDays: 30,
      });

      expect(result.health).toBe('defaulted');
    });
  });

  describe('calculateDaysOverdue', () => {
    it('calculates days overdue', () => {
      const maturity = new Date('2026-09-01');
      const current = new Date('2026-09-10');
      expect(calculateDaysOverdue(maturity, current)).toBe(9);
    });

    it('returns 0 when not overdue', () => {
      const maturity = new Date('2026-09-20');
      const current = new Date('2026-09-10');
      expect(calculateDaysOverdue(maturity, current)).toBe(0);
    });
  });

  describe('calculateArrears', () => {
    it('calculates arrears', () => {
      expect(calculateArrears(8667, 4067)).toBe(4600);
    });

    it('returns 0 when paid in full', () => {
      expect(calculateArrears(8667, 8667)).toBe(0);
    });

    it('returns 0 when overpaid', () => {
      expect(calculateArrears(8667, 9000)).toBe(0);
    });
  });

  describe('calculateCollectionEfficiency', () => {
    it('calculates efficiency', () => {
      expect(calculateCollectionEfficiency(8000, 10000)).toBe(80);
    });

    it('returns 100 when expected is 0', () => {
      expect(calculateCollectionEfficiency(0, 0)).toBe(100);
    });
  });

  describe('calculatePAR', () => {
    it('calculates PAR percentage', () => {
      const par = calculatePAR(5000, 3000, 2000, 100000);
      expect(par).toBe(10);
    });
  });
});
