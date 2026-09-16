/**
 * Repayment schedule generation.
 * Generates instalment rows with principal, interest, fees, penalties.
 * Final instalment absorbs residual to ensure totals are exact.
 *
 * @module lib/loan/schedule
 */

import { type Kwacha, toNgwee, toKwacha } from '@/lib/money';
import {
  calculateTotalInterest,
  type InterestType,
} from '@/lib/loan/interest';

export interface ScheduleInput {
  principal: Kwacha;
  annualRate: number;
  duration: number;
  durationUnit: 'days' | 'weeks' | 'months';
  interestType: InterestType;
  repaymentFrequency: 'daily' | 'weekly' | 'monthly';
  processingFee: Kwacha;
  disbursementDate: Date;
}

export interface Instalment {
  instalmentNumber: number;
  dueDate: Date;
  principal: Kwacha;
  interest: Kwacha;
  fee: Kwacha;
  penalty: Kwacha;
  totalDue: Kwacha;
  remaining: Kwacha;
  status: 'upcoming' | 'due' | 'part_paid' | 'paid' | 'overdue';
}

export interface ScheduleResult {
  instalments: Instalment[];
  totalPrincipal: Kwacha;
  totalInterest: Kwacha;
  totalFees: Kwacha;
  totalRepayable: Kwacha;
  instalmentCount: number;
}

/** Get the interval between instalments based on frequency. */
function getInterval(frequency: 'daily' | 'weekly' | 'monthly'): number {
  switch (frequency) {
    case 'daily': return 1;
    case 'weekly': return 7;
    case 'monthly': return 30;
  }
}

/** Add days to a date, skipping weekends (Mon-Fri only). */
function addWorkingDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) {
      added++;
    }
  }
  return result;
}

/** Add months to a date. */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/** Generate a repayment schedule. */
export function generateSchedule(input: ScheduleInput): ScheduleResult {
  const {
    principal,
    annualRate,
    duration,
    durationUnit,
    interestType,
    repaymentFrequency,
    processingFee,
    disbursementDate,
  } = input;

  // Calculate total interest
  const interestResult = calculateTotalInterest({
    principal,
    annualRate,
    duration,
    durationUnit,
    interestType,
  });

  const totalInterest = interestResult.totalInterest;
  const totalRepayable = principal + totalInterest + processingFee;

  // Calculate instalment count based on frequency
  let instalmentCount: number;
  switch (repaymentFrequency) {
    case 'daily':
      instalmentCount = durationUnit === 'days' ? duration
        : durationUnit === 'weeks' ? duration * 7
        : duration * 30;
      break;
    case 'weekly':
      instalmentCount = durationUnit === 'weeks' ? duration
        : durationUnit === 'months' ? duration * 4
        : Math.ceil(duration / 7);
      break;
    case 'monthly':
    default:
      instalmentCount = durationUnit === 'months' ? duration
        : durationUnit === 'weeks' ? Math.ceil(duration / 4)
        : Math.ceil(duration / 30);
      break;
  }

  if (instalmentCount <= 0) instalmentCount = 1;

  // Calculate base instalment amounts in ngwee for precision
  const principalNgwee = toNgwee(principal);
  const basePrincipalNgwee = Math.floor(principalNgwee / instalmentCount);
  const principalRemainder = principalNgwee - basePrincipalNgwee * instalmentCount;

  const interestNgwee = toNgwee(totalInterest);
  const baseInterestNgwee = Math.floor(interestNgwee / instalmentCount);
  const interestRemainder = interestNgwee - baseInterestNgwee * instalmentCount;

  const feeNgwee = toNgwee(processingFee);
  const baseFeeNgwee = Math.floor(feeNgwee / instalmentCount);
  const feeRemainder = feeNgwee - baseFeeNgwee * instalmentCount;

  const interval = getInterval(repaymentFrequency);
  const instalments: Instalment[] = [];

  for (let i = 1; i <= instalmentCount; i++) {
    const isLast = i === instalmentCount;

    // Calculate due date
    let dueDate: Date;
    if (repaymentFrequency === 'daily') {
      dueDate = addWorkingDays(disbursementDate, interval * i);
    } else if (repaymentFrequency === 'weekly') {
      dueDate = addWorkingDays(disbursementDate, interval * i);
    } else {
      dueDate = addMonths(disbursementDate, i);
    }

    // Principal for this instalment
    let principalPortionNgwee = basePrincipalNgwee;
    if (isLast) {
      principalPortionNgwee = principalNgwee - basePrincipalNgwee * (instalmentCount - 1);
    } else if (i <= principalRemainder) {
      principalPortionNgwee += 1;
    }

    // Interest for this instalment
    let interestPortionNgwee = baseInterestNgwee;
    if (isLast) {
      interestPortionNgwee = interestNgwee - baseInterestNgwee * (instalmentCount - 1);
    } else if (i <= interestRemainder) {
      interestPortionNgwee += 1;
    }

    // Fee for this instalment
    let feePortionNgwee = baseFeeNgwee;
    if (isLast) {
      feePortionNgwee = feeNgwee - baseFeeNgwee * (instalmentCount - 1);
    } else if (i <= feeRemainder) {
      feePortionNgwee += 1;
    }

    const totalDueNgwee = principalPortionNgwee + interestPortionNgwee + feePortionNgwee;

    instalments.push({
      instalmentNumber: i,
      dueDate,
      principal: toKwacha(principalPortionNgwee),
      interest: toKwacha(interestPortionNgwee),
      fee: toKwacha(feePortionNgwee),
      penalty: 0,
      totalDue: toKwacha(totalDueNgwee),
      remaining: toKwacha(totalDueNgwee),
      status: 'upcoming',
    });
  }

  return {
    instalments,
    totalPrincipal: principal,
    totalInterest,
    totalFees: processingFee,
    totalRepayable,
    instalmentCount,
  };
}
