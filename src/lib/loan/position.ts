/**
 * Loan position calculations (arrears, shortfall, outstanding, health).
 *
 * @module lib/loan/position
 */

import { type Kwacha, toNgwee, toKwacha } from '@/lib/money';

export type LoanHealth = 'performing' | 'at_risk' | 'overdue' | 'defaulted';

export interface PositionInput {
  totalRepayable: Kwacha;
  amountPaid: Kwacha;
  arrears: Kwacha;
  daysOverdue: number;
  gracePeriodDays: number;
  defaultAfterDays: number;
}

export interface PositionResult {
  outstandingBalance: Kwacha;
  amountDueToDate: Kwacha;
  collectionShortfall: Kwacha;
  arrears: Kwacha;
  health: LoanHealth;
  daysOverdue: number;
  percentPaid: number;
}

/** Calculate loan position based on payment data. */
export function calculatePosition(input: PositionInput): PositionResult {
  const {
    totalRepayable,
    amountPaid,
    arrears,
    daysOverdue,
    gracePeriodDays,
    defaultAfterDays,
  } = input;

  const outstandingBalanceNgwee = toNgwee(totalRepayable) - toNgwee(amountPaid);
  const outstandingBalance = toKwacha(Math.max(outstandingBalanceNgwee, 0));

  // Determine health
  let health: LoanHealth;
  if (daysOverdue <= 0) {
    health = 'performing';
  } else if (daysOverdue <= gracePeriodDays) {
    health = 'at_risk';
  } else if (daysOverdue < defaultAfterDays) {
    health = 'overdue';
  } else {
    health = 'defaulted';
  }

  const percentPaid = totalRepayable > 0
    ? (amountPaid / totalRepayable) * 100
    : 0;

  return {
    outstandingBalance,
    amountDueToDate: totalRepayable,
    collectionShortfall: arrears,
    arrears,
    health,
    daysOverdue,
    percentPaid,
  };
}

/** Calculate days overdue from maturity date. */
export function calculateDaysOverdue(
  maturityDate: Date | string,
  currentDate: Date = new Date(),
): number {
  const maturity = typeof maturityDate === 'string' ? new Date(maturityDate) : maturityDate;
  const diffMs = currentDate.getTime() - maturity.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

/** Calculate arrears from schedule. */
export function calculateArrears(
  scheduledAmount: Kwacha,
  paidAmount: Kwacha,
): Kwacha {
  const arrearsNgwee = toNgwee(scheduledAmount) - toNgwee(paidAmount);
  return toKwacha(Math.max(arrearsNgwee, 0));
}

/** Calculate collection efficiency (collected / expected). */
export function calculateCollectionEfficiency(
  collected: Kwacha,
  expected: Kwacha,
): number {
  if (expected <= 0) return 100;
  return Math.min(100, (collected / expected) * 100);
}

/** Calculate portfolio at risk (PAR) percentage. */
export function calculatePAR(
  atRiskAmount: Kwacha,
  overdueAmount: Kwacha,
  defaultedAmount: Kwacha,
  totalOutstanding: Kwacha,
): number {
  if (totalOutstanding <= 0) return 0;
  const parNgwee = toNgwee(atRiskAmount) + toNgwee(overdueAmount) + toNgwee(defaultedAmount);
  return (parNgwee / toNgwee(totalOutstanding)) * 100;
}
