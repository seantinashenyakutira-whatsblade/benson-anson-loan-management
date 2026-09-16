import { describe, it, expect } from 'vitest';
import { generateSchedule } from '@/lib/loan/schedule';

describe('schedule', () => {
  describe('generateSchedule', () => {
    it('generates monthly schedule', () => {
      const result = generateSchedule({
        principal: 20000,
        annualRate: 25,
        duration: 3,
        durationUnit: 'months',
        interestType: 'flat',
        repaymentFrequency: 'monthly',
        processingFee: 1000,
        disbursementDate: new Date('2026-01-15'),
      });

      expect(result.instalmentCount).toBe(3);
      expect(result.instalments).toHaveLength(3);
      expect(result.totalPrincipal).toBe(20000);
      expect(result.totalInterest).toBe(1250);
      expect(result.totalFees).toBe(1000);
      expect(result.totalRepayable).toBe(22250);
    });

    it('generates weekly schedule', () => {
      const result = generateSchedule({
        principal: 5000,
        annualRate: 20,
        duration: 12,
        durationUnit: 'weeks',
        interestType: 'flat',
        repaymentFrequency: 'weekly',
        processingFee: 0,
        disbursementDate: new Date('2026-01-15'),
      });

      expect(result.instalmentCount).toBe(12);
      expect(result.instalments).toHaveLength(12);
    });

    it('final instalment absorbs residual', () => {
      const result = generateSchedule({
        principal: 10000,
        annualRate: 25,
        duration: 3,
        durationUnit: 'months',
        interestType: 'flat',
        repaymentFrequency: 'monthly',
        processingFee: 0,
        disbursementDate: new Date('2026-01-15'),
      });

      const totalPrincipal = result.instalments.reduce((sum, inst) => sum + inst.principal, 0);
      const totalInterest = result.instalments.reduce((sum, inst) => sum + inst.interest, 0);

      expect(totalPrincipal).toBeCloseTo(10000, 0);
      expect(totalInterest).toBeCloseTo(result.totalInterest, 0);
    });

    it('all instalments are upcoming', () => {
      const result = generateSchedule({
        principal: 10000,
        annualRate: 25,
        duration: 3,
        durationUnit: 'months',
        interestType: 'flat',
        repaymentFrequency: 'monthly',
        processingFee: 0,
        disbursementDate: new Date('2026-01-15'),
      });

      for (const inst of result.instalments) {
        expect(inst.status).toBe('upcoming');
      }
    });
  });
});
