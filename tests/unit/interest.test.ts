import { describe, it, expect } from 'vitest';
import {
  calculateTotalInterest,
  calculateInstalmentInterest,
  calculateFlatInstalmentInterest,
  calculateFlatFinalInstalmentInterest,
} from '@/lib/loan/interest';

describe('interest', () => {
  describe('calculateTotalInterest', () => {
    it('calculates flat interest for months', () => {
      const result = calculateTotalInterest({
        principal: 20000,
        annualRate: 25,
        duration: 3,
        durationUnit: 'months',
        interestType: 'flat',
      });

      // 20000 × 25% × (3/12) = 1250
      expect(result.totalInterest).toBe(1250);
    });

    it('calculates flat interest for weeks', () => {
      const result = calculateTotalInterest({
        principal: 5000,
        annualRate: 20,
        duration: 12,
        durationUnit: 'weeks',
        interestType: 'flat',
      });

      // 5000 × 20% × (12/52) ≈ 230.77
      expect(result.totalInterest).toBeCloseTo(230.77, 0);
    });

    it('calculates reducing balance interest', () => {
      const result = calculateTotalInterest({
        principal: 10000,
        annualRate: 25,
        duration: 3,
        durationUnit: 'months',
        interestType: 'reducing_balance',
      });

      // Should be less than flat interest
      expect(result.totalInterest).toBeGreaterThan(0);
      expect(result.totalInterest).toBeLessThan(625); // flat would be 625
    });
  });

  describe('calculateInstalmentInterest', () => {
    it('calculates interest for a single period', () => {
      const interest = calculateInstalmentInterest(10000, 25, 12);
      // 10000 × 25% / 12 ≈ 208.33
      expect(interest).toBeCloseTo(208.33, 0);
    });
  });

  describe('calculateFlatInstalmentInterest', () => {
    it('divides interest equally', () => {
      const interest = calculateFlatInstalmentInterest(1250, 3);
      // 1250 / 3 = 416.67
      expect(interest).toBeCloseTo(416.67, 0);
    });
  });

  describe('calculateFlatFinalInstalmentInterest', () => {
    it('absorbs residual', () => {
      const interest = calculateFlatFinalInstalmentInterest(1250, 3, 2);
      // 125000 ngwee - floor(125000/3) * 2 = 125000 - 41666*2 = 125000 - 83332 = 41668 ngwee = 416.68
      expect(interest).toBeCloseTo(416.68, 0);
    });
  });
});
