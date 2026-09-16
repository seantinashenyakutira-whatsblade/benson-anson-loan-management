import { describe, it, expect } from 'vitest';
import {
  calculatePenalty,
  shouldAssessPenalty,
  shouldDefault,
} from '@/lib/loan/penalty';

describe('penalty', () => {
  describe('calculatePenalty', () => {
    it('returns zero for none rule type', () => {
      const result = calculatePenalty({
        ruleType: 'none',
        penaltyValue: 5,
        arrearsAmount: 1000,
        daysOverdue: 10,
      });
      expect(result.amount).toBe(0);
    });

    it('returns zero when not overdue', () => {
      const result = calculatePenalty({
        ruleType: 'fixed',
        penaltyValue: 50,
        arrearsAmount: 1000,
        daysOverdue: 0,
      });
      expect(result.amount).toBe(0);
    });

    it('calculates fixed penalty', () => {
      const result = calculatePenalty({
        ruleType: 'fixed',
        penaltyValue: 50,
        arrearsAmount: 1000,
        daysOverdue: 5,
      });
      expect(result.amount).toBe(50);
    });

    it('calculates percent of overdue', () => {
      const result = calculatePenalty({
        ruleType: 'percent_of_overdue',
        penaltyValue: 5,
        arrearsAmount: 1000,
        daysOverdue: 5,
      });
      // 5% of 1000 = 50
      expect(result.amount).toBe(50);
    });

    it('calculates daily penalty', () => {
      const result = calculatePenalty({
        ruleType: 'daily',
        penaltyValue: 10,
        arrearsAmount: 1000,
        daysOverdue: 7,
      });
      // 10 × 7 = 70
      expect(result.amount).toBe(70);
    });

    it('calculates weekly penalty', () => {
      const result = calculatePenalty({
        ruleType: 'weekly',
        penaltyValue: 50,
        arrearsAmount: 1000,
        daysOverdue: 15,
      });
      // ceil(15/7) = 3 weeks, 50 × 3 = 150
      expect(result.amount).toBe(150);
    });

    it('applies penalty cap', () => {
      const result = calculatePenalty({
        ruleType: 'daily',
        penaltyValue: 100,
        arrearsAmount: 1000,
        daysOverdue: 10,
        penaltyCap: 500,
      });
      // 100 × 10 = 1000, but capped at 500
      expect(result.amount).toBe(500);
    });
  });

  describe('shouldAssessPenalty', () => {
    it('returns true past grace period', () => {
      expect(shouldAssessPenalty(5, 3)).toBe(true);
    });

    it('returns false within grace period', () => {
      expect(shouldAssessPenalty(2, 3)).toBe(false);
    });
  });

  describe('shouldDefault', () => {
    it('returns true at default threshold', () => {
      expect(shouldDefault(30, 30)).toBe(true);
    });

    it('returns false before threshold', () => {
      expect(shouldDefault(29, 30)).toBe(false);
    });
  });
});
