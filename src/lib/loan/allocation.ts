/**
 * Payment allocation engine.
 * Allocates payments across penalty → fee → interest → principal → unallocated.
 *
 * @module lib/loan/allocation
 */

import { type Kwacha, toNgwee, toKwacha } from '@/lib/money';

export type AllocationComponent = 'penalty' | 'fee' | 'interest' | 'principal' | 'unallocated';

export interface AllocationInput {
  amount: Kwacha;
  penalties: Kwacha;
  fees: Kwacha;
  interest: Kwacha;
  principal: Kwacha;
  allocationOrder?: AllocationComponent[];
}

export interface AllocationResult {
  penalty: Kwacha;
  fee: Kwacha;
  interest: Kwacha;
  principal: Kwacha;
  unallocated: Kwacha;
  totalAllocated: Kwacha;
}

const DEFAULT_ORDER: AllocationComponent[] = [
  'penalty',
  'fee',
  'interest',
  'principal',
  'unallocated',
];

/** Allocate a payment amount across components in priority order. */
export function allocatePayment(input: AllocationInput): AllocationResult {
  const {
    amount,
    penalties,
    fees,
    interest,
    principal,
    allocationOrder = DEFAULT_ORDER,
  } = input;

  let remainingNgwee = toNgwee(amount);

  const result: Record<AllocationComponent, number> = {
    penalty: 0,
    fee: 0,
    interest: 0,
    principal: 0,
    unallocated: 0,
  };

  // Track what's owed for each component
  const owed: Record<AllocationComponent, number> = {
    penalty: toNgwee(penalties),
    fee: toNgwee(fees),
    interest: toNgwee(interest),
    principal: toNgwee(principal),
    unallocated: 0,
  };

  for (const component of allocationOrder) {
    if (component === 'unallocated') continue;
    if (remainingNgwee <= 0) break;

    const allocNgwee = Math.min(remainingNgwee, owed[component]);
    if (allocNgwee > 0) {
      result[component] += allocNgwee;
      remainingNgwee -= allocNgwee;
    }
  }

  // Any remainder goes to unallocated
  if (remainingNgwee > 0) {
    result.unallocated += remainingNgwee;
    remainingNgwee = 0;
  }

  return {
    penalty: toKwacha(result.penalty),
    fee: toKwacha(result.fee),
    interest: toKwacha(result.interest),
    principal: toKwacha(result.principal),
    unallocated: toKwacha(result.unallocated),
    totalAllocated: amount - toKwacha(remainingNgwee),
  };
}

/** Allocate across multiple instalments in due-date order. */
export interface InstalmentAllocation {
  instalmentNumber: number;
  penalty: Kwacha;
  fee: Kwacha;
  interest: Kwacha;
  principal: Kwacha;
}

export interface MultiInstalmentInput {
  amount: Kwacha;
  instalments: Array<{
    instalmentNumber: number;
    penaltyOwed: Kwacha;
    feeOwed: Kwacha;
    interestOwed: Kwacha;
    principalOwed: Kwacha;
  }>;
  allocationOrder?: AllocationComponent[];
}

export interface MultiInstalmentResult {
  allocations: InstalmentAllocation[];
  totalPenalty: Kwacha;
  totalFee: Kwacha;
  totalInterest: Kwacha;
  totalPrincipal: Kwacha;
  unallocated: Kwacha;
}

/** Allocate payment across multiple instalments. */
export function allocateAcrossInstalments(input: MultiInstalmentInput): MultiInstalmentResult {
  const { amount, instalments, allocationOrder = DEFAULT_ORDER } = input;

  let remainingNgwee = toNgwee(amount);
  const allocations: InstalmentAllocation[] = [];

  let totalPenaltyNgwee = 0;
  let totalFeeNgwee = 0;
  let totalInterestNgwee = 0;
  let totalPrincipalNgwee = 0;

  for (const inst of instalments) {
    if (remainingNgwee <= 0) break;

    const instAlloc = { instalmentNumber: inst.instalmentNumber, penalty: 0, fee: 0, interest: 0, principal: 0 };
    const instOwed: Record<string, number> = {
      penalty: toNgwee(inst.penaltyOwed),
      fee: toNgwee(inst.feeOwed),
      interest: toNgwee(inst.interestOwed),
      principal: toNgwee(inst.principalOwed),
    };

    for (const component of allocationOrder) {
      if (component === 'unallocated') continue;
      if (remainingNgwee <= 0) break;

      const allocNgwee = Math.min(remainingNgwee, instOwed[component] ?? 0);
      if (allocNgwee > 0) {
        instAlloc[component as keyof Omit<InstalmentAllocation, 'instalmentNumber'>] += allocNgwee;
        remainingNgwee -= allocNgwee;
      }
    }

    totalPenaltyNgwee += instAlloc.penalty;
    totalFeeNgwee += instAlloc.fee;
    totalInterestNgwee += instAlloc.interest;
    totalPrincipalNgwee += instAlloc.principal;

    if (instAlloc.penalty + instAlloc.fee + instAlloc.interest + instAlloc.principal > 0) {
      allocations.push({
        ...instAlloc,
        penalty: toKwacha(instAlloc.penalty),
        fee: toKwacha(instAlloc.fee),
        interest: toKwacha(instAlloc.interest),
        principal: toKwacha(instAlloc.principal),
      });
    }
  }

  return {
    allocations,
    totalPenalty: toKwacha(totalPenaltyNgwee),
    totalFee: toKwacha(totalFeeNgwee),
    totalInterest: toKwacha(totalInterestNgwee),
    totalPrincipal: toKwacha(totalPrincipalNgwee),
    unallocated: toKwacha(remainingNgwee),
  };
}
