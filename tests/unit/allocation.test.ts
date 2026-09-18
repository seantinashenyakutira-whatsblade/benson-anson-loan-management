import { describe, it, expect } from 'vitest';
import { allocatePayment, allocateAcrossInstalments } from '@/lib/loan/allocation';

describe('allocation', () => {
  describe('allocatePayment', () => {
    it('allocates across penalty first', () => {
      const result = allocatePayment({
        amount: 1000,
        penalties: 200,
        fees: 100,
        interest: 300,
        principal: 400,
      });

      expect(result.penalty).toBe(200);
      expect(result.fee).toBe(100);
      expect(result.interest).toBe(300);
      expect(result.principal).toBe(400);
      expect(result.unallocated).toBe(0);
    });

    it('allocates partial amount', () => {
      const result = allocatePayment({
        amount: 500,
        penalties: 200,
        fees: 100,
        interest: 300,
        principal: 400,
      });

      expect(result.penalty).toBe(200);
      expect(result.fee).toBe(100);
      expect(result.interest).toBe(200);
      expect(result.principal).toBe(0);
      expect(result.unallocated).toBe(0);
    });

    it('handles overpayment', () => {
      const result = allocatePayment({
        amount: 2000,
        penalties: 200,
        fees: 100,
        interest: 300,
        principal: 400,
      });

      expect(result.penalty).toBe(200);
      expect(result.fee).toBe(100);
      expect(result.interest).toBe(300);
      expect(result.principal).toBe(400);
      expect(result.unallocated).toBe(1000);
    });

    it('respects custom allocation order', () => {
      const result = allocatePayment({
        amount: 500,
        penalties: 200,
        fees: 100,
        interest: 300,
        principal: 400,
        allocationOrder: ['principal', 'interest', 'fee', 'penalty', 'unallocated'],
      });

      expect(result.principal).toBe(400);
      expect(result.interest).toBe(100);
      expect(result.fee).toBe(0);
      expect(result.penalty).toBe(0);
      expect(result.unallocated).toBe(0);
    });
  });

  describe('allocateAcrossInstalments', () => {
    it('allocates across multiple instalments', () => {
      const result = allocateAcrossInstalments({
        amount: 1000,
        instalments: [
          { instalmentNumber: 1, penaltyOwed: 50, feeOwed: 25, interestOwed: 100, principalOwed: 300 },
          { instalmentNumber: 2, penaltyOwed: 50, feeOwed: 25, interestOwed: 100, principalOwed: 300 },
        ],
      });

      expect(result.allocations).toHaveLength(2);
      expect(result.totalPenalty).toBe(100);
      expect(result.totalFee).toBe(50);
      expect(result.totalInterest).toBe(200);
      expect(result.totalPrincipal).toBe(600);
      expect(result.unallocated).toBe(50);
    });

    it('handles partial payment across instalments', () => {
      const result = allocateAcrossInstalments({
        amount: 200,
        instalments: [
          { instalmentNumber: 1, penaltyOwed: 50, feeOwed: 25, interestOwed: 100, principalOwed: 300 },
          { instalmentNumber: 2, penaltyOwed: 50, feeOwed: 25, interestOwed: 100, principalOwed: 300 },
        ],
      });

      expect(result.allocations).toHaveLength(1);
      expect(result.allocations[0]?.instalmentNumber).toBe(1);
    });

    it('splits K500 across interest then principal in default order', () => {
      const result = allocateAcrossInstalments({
        amount: 500,
        instalments: [
          { instalmentNumber: 1, penaltyOwed: 0, feeOwed: 0, interestOwed: 200, principalOwed: 600 },
        ],
      });

      expect(result.totalInterest).toBe(200);
      expect(result.totalPrincipal).toBe(300);
      expect(result.unallocated).toBe(0);
    });

    it('sends surplus to unallocated_credit on overpayment', () => {
      const result = allocateAcrossInstalments({
        amount: 1000,
        instalments: [
          { instalmentNumber: 1, penaltyOwed: 0, feeOwed: 0, interestOwed: 200, principalOwed: 600 },
        ],
      });

      expect(result.totalInterest).toBe(200);
      expect(result.totalPrincipal).toBe(600);
      expect(result.unallocated).toBe(200);
    });

    it('pays penalty first when penalty is due', () => {
      const result = allocateAcrossInstalments({
        amount: 300,
        instalments: [
          { instalmentNumber: 1, penaltyOwed: 150, feeOwed: 0, interestOwed: 100, principalOwed: 500 },
        ],
      });

      expect(result.totalPenalty).toBe(150);
      expect(result.totalInterest).toBe(100);
      expect(result.totalPrincipal).toBe(50);
      expect(result.unallocated).toBe(0);
    });
  });
});
