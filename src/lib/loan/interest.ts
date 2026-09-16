/**
 * Interest calculation — flat and reducing balance.
 *
 * Flat interest: total_interest = principal × rate × duration
 * Reducing balance: each instalment recalculates on remaining balance.
 *
 * @module lib/loan/interest
 */

import { type Kwacha, toNgwee, toKwacha } from '@/lib/money';

export type InterestType = 'flat' | 'reducing_balance';

export interface InterestInput {
  principal: Kwacha;
  annualRate: number; // e.g. 25 for 25%
  duration: number;
  durationUnit: 'days' | 'weeks' | 'months';
  interestType: InterestType;
}

export interface InterestResult {
  totalInterest: Kwacha;
  monthlyRate: number;
  effectiveRate: number;
}

/** Calculate total interest for a loan. */
export function calculateTotalInterest(input: InterestInput): InterestResult {
  const { principal, annualRate, duration, durationUnit, interestType } = input;

  const periodsPerYear = durationUnit === 'months' ? 12
    : durationUnit === 'weeks' ? 52
    : 365;

  const effectiveRate = annualRate / 100 / periodsPerYear;
  const monthlyRate = annualRate / 100 / 12;

  if (interestType === 'flat') {
    const years = durationUnit === 'months' ? duration / 12
      : durationUnit === 'weeks' ? duration / 52
      : duration / 365;

    const totalInterestNgwee = Math.round(
      toNgwee(principal) * (annualRate / 100) * years,
    );

    return {
      totalInterest: toKwacha(totalInterestNgwee),
      monthlyRate,
      effectiveRate,
    };
  }

  let totalInterestNgwee = 0;
  const principalNgwee = toNgwee(principal);
  let remainingNgwee = principalNgwee;

  for (let i = 0; i < duration; i++) {
    const interestNgwee = Math.round(remainingNgwee * effectiveRate);
    totalInterestNgwee += interestNgwee;

    const principalPortion = Math.round(principalNgwee / duration);
    remainingNgwee -= principalPortion;
  }

  return {
    totalInterest: toKwacha(totalInterestNgwee),
    monthlyRate,
    effectiveRate,
  };
}

/** Calculate the interest portion for a single instalment (reducing balance). */
export function calculateInstalmentInterest(
  remainingBalance: Kwacha,
  annualRate: number,
  periodsPerYear: number,
): Kwacha {
  const rate = annualRate / 100 / periodsPerYear;
  const interestNgwee = Math.round(toNgwee(remainingBalance) * rate);
  return toKwacha(interestNgwee);
}

/** Calculate the interest portion for a single instalment (flat). */
export function calculateFlatInstalmentInterest(
  totalInterest: Kwacha,
  totalInstalments: number,
): Kwacha {
  const totalNgwee = toNgwee(totalInterest);
  const baseNgwee = Math.floor(totalNgwee / totalInstalments);
  return toKwacha(baseNgwee);
}

/** Calculate flat instalment interest for the final instalment (absorbs residual). */
export function calculateFlatFinalInstalmentInterest(
  totalInterest: Kwacha,
  totalInstalments: number,
  previousInstalments: number,
): Kwacha {
  const totalNgwee = toNgwee(totalInterest);
  const baseNgwee = Math.floor(totalNgwee / totalInstalments);
  const previousTotal = baseNgwee * previousInstalments;
  return toKwacha(totalNgwee - previousTotal);
}
