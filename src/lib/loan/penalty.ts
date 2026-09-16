/**
 * Penalty calculation engine.
 * Assesses penalties based on overdue days and product rules.
 *
 * @module lib/loan/penalty
 */

import { type Kwacha, toNgwee, toKwacha } from '@/lib/money';

export type PenaltyRuleType =
  | 'none'
  | 'fixed'
  | 'percent_of_overdue'
  | 'daily'
  | 'weekly';

export interface PenaltyInput {
  ruleType: PenaltyRuleType;
  penaltyValue: number;
  arrearsAmount: Kwacha;
  daysOverdue: number;
  penaltyCap?: Kwacha;
}

export interface PenaltyResult {
  amount: Kwacha;
  description: string;
}

/** Calculate penalty amount based on rule type. */
export function calculatePenalty(input: PenaltyInput): PenaltyResult {
  const { ruleType, penaltyValue, arrearsAmount, daysOverdue, penaltyCap } = input;

  if (ruleType === 'none' || daysOverdue <= 0) {
    return { amount: 0, description: 'No penalty' };
  }

  let amountNgwee: number;

  switch (ruleType) {
    case 'fixed':
      amountNgwee = toNgwee(penaltyValue);
      break;

    case 'percent_of_overdue':
      amountNgwee = Math.round(toNgwee(arrearsAmount) * (penaltyValue / 100));
      break;

    case 'daily':
      amountNgwee = toNgwee(penaltyValue) * daysOverdue;
      break;

    case 'weekly': {
      const weeks = Math.ceil(daysOverdue / 7);
      amountNgwee = toNgwee(penaltyValue) * weeks;
      break;
    }

    default:
      amountNgwee = 0;
  }

  // Apply cap if set
  let amount = toKwacha(amountNgwee);
  if (penaltyCap !== undefined && amount > penaltyCap) {
    amount = penaltyCap;
  }

  const description = buildPenaltyDescription(ruleType, penaltyValue, arrearsAmount, daysOverdue, amount);

  return { amount, description };
}

/** Calculate cumulative penalties over time. */
export function calculateCumulativePenalties(
  input: PenaltyInput,
  daysOverdueRange: number[],
): Kwacha {
  let totalNgwee = 0;

  for (const days of daysOverdueRange) {
    const result = calculatePenalty({ ...input, daysOverdue: days });
    totalNgwee += toNgwee(result.amount);
  }

  return toKwacha(totalNgwee);
}

/** Check if penalty should be assessed (past grace period). */
export function shouldAssessPenalty(
  daysOverdue: number,
  gracePeriodDays: number,
): boolean {
  return daysOverdue > gracePeriodDays;
}

/** Check if loan should default. */
export function shouldDefault(
  daysOverdue: number,
  defaultAfterDays: number,
): boolean {
  return daysOverdue >= defaultAfterDays;
}

function buildPenaltyDescription(
  ruleType: PenaltyRuleType,
  penaltyValue: number,
  arrearsAmount: Kwacha,
  daysOverdue: number,
  amount: Kwacha,
): string {
  switch (ruleType) {
    case 'fixed':
      return `Fixed penalty of K${penaltyValue.toFixed(2)}`;
    case 'percent_of_overdue':
      return `${penaltyValue}% of K${arrearsAmount.toFixed(2)} overdue (${daysOverdue} days)`;
    case 'daily':
      return `K${penaltyValue.toFixed(2)}/day × ${daysOverdue} days = K${amount.toFixed(2)}`;
    case 'weekly': {
      const weeks = Math.ceil(daysOverdue / 7);
      return `K${penaltyValue.toFixed(2)}/week × ${weeks} weeks = K${amount.toFixed(2)}`;
    }
    default:
      return 'No penalty';
  }
}
