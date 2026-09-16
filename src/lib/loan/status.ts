/**
 * Loan status state machine.
 * Defines valid status transitions and health states.
 *
 * @module lib/loan/status
 */

export type LoanStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'returned'
  | 'disbursed'
  | 'performing'
  | 'at_risk'
  | 'overdue'
  | 'defaulted'
  | 'fully_paid'
  | 'closed'
  | 'collateral_released';

export type LoanHealth = 'performing' | 'at_risk' | 'overdue' | 'defaulted';

/** Valid transitions from each status. */
const TRANSITIONS: Record<LoanStatus, LoanStatus[]> = {
  draft: ['submitted'],
  submitted: ['under_review', 'approved', 'rejected', 'returned'],
  under_review: ['approved', 'rejected', 'returned'],
  approved: ['disbursed', 'rejected'],
  rejected: [],
  returned: ['submitted'],
  disbursed: ['performing', 'at_risk', 'overdue', 'defaulted', 'fully_paid'],
  performing: ['at_risk', 'overdue', 'defaulted', 'fully_paid'],
  at_risk: ['performing', 'overdue', 'defaulted', 'fully_paid'],
  overdue: ['performing', 'at_risk', 'defaulted', 'fully_paid'],
  defaulted: ['fully_paid', 'closed'],
  fully_paid: ['closed', 'collateral_released'],
  closed: ['collateral_released'],
  collateral_released: [],
};

/** Check if a status transition is valid. */
export function canTransition(from: LoanStatus, to: LoanStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Get all valid transitions from a status. */
export function getValidTransitions(status: LoanStatus): LoanStatus[] {
  return TRANSITIONS[status] ?? [];
}

/** Determine the effective status from health state. */
export function getEffectiveStatus(
  health: LoanHealth,
  isFullyPaid: boolean,
): LoanStatus {
  if (isFullyPaid) return 'fully_paid';
  return health;
}

/** Determine health from days overdue and thresholds. */
export function determineHealth(
  daysOverdue: number,
  gracePeriodDays: number,
  defaultAfterDays: number,
): LoanHealth {
  if (daysOverdue <= 0) return 'performing';
  if (daysOverdue <= gracePeriodDays) return 'at_risk';
  if (daysOverdue < defaultAfterDays) return 'overdue';
  return 'defaulted';
}

/** Check if a loan is in a terminal state. */
export function isTerminal(status: LoanStatus): boolean {
  return ['rejected', 'closed', 'collateral_released'].includes(status);
}

/** Check if a loan is active (can have payments). */
export function isActive(status: LoanStatus): boolean {
  return ['disbursed', 'performing', 'at_risk', 'overdue', 'defaulted'].includes(status);
}

/** Check if a loan can be disbursed. */
export function canDisburse(status: LoanStatus): boolean {
  return status === 'approved';
}

/** Check if a loan can have payments recorded. */
export function canRecordPayment(status: LoanStatus): boolean {
  return isActive(status) || status === 'fully_paid';
}

/** Get human-readable status label. */
export function getStatusLabel(status: LoanStatus): string {
  const labels: Record<LoanStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under Review',
    approved: 'Approved',
    rejected: 'Rejected',
    returned: 'Returned',
    disbursed: 'Disbursed',
    performing: 'Performing',
    at_risk: 'At Risk',
    overdue: 'Overdue',
    defaulted: 'Defaulted',
    fully_paid: 'Fully Paid',
    closed: 'Closed',
    collateral_released: 'Collateral Released',
  };
  return labels[status] ?? status;
}

/** Get status color for UI. */
export function getStatusColor(status: LoanStatus): string {
  const colors: Record<LoanStatus, string> = {
    draft: 'text-text-muted',
    submitted: 'text-info',
    under_review: 'text-warning',
    approved: 'text-success',
    rejected: 'text-danger',
    returned: 'text-warning',
    disbursed: 'text-info',
    performing: 'text-success',
    at_risk: 'text-warning',
    overdue: 'text-orange',
    defaulted: 'text-danger',
    fully_paid: 'text-success',
    closed: 'text-text-muted',
    collateral_released: 'text-text-muted',
  };
  return colors[status] ?? 'text-text-muted';
}
