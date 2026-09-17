/**
 * Shared TypeScript types for the Anson Benson Cash Solutions system.
 */

/* ── Roles ──────────────────────────────────────────────── */
export type UserRole = 'owner' | 'branch_manager' | 'loan_officer' | 'cashier';

/* ── Loan Status ────────────────────────────────────────── */
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

/* ── Loan Health Indicator ───────────────────────────────── */
export type LoanHealth = 'performing' | 'at_risk' | 'overdue' | 'defaulted';

export const LOAN_HEALTH_CONFIG: Record<
  LoanHealth,
  { label: string; color: string; emoji: string }
> = {
  performing: { label: 'Performing', color: 'success', emoji: '🟢' },
  at_risk: { label: 'At Risk', color: 'warning', emoji: '🟡' },
  overdue: { label: 'Overdue', color: 'orange', emoji: '🟠' },
  defaulted: { label: 'Defaulted', color: 'danger', emoji: '🔴' },
};

/* ── Interest Type ──────────────────────────────────────── */
export type InterestType = 'flat' | 'reducing_balance';

/* ── Duration Unit ──────────────────────────────────────── */
export type DurationUnit = 'days' | 'weeks' | 'months';

/* ── Repayment Frequency ────────────────────────────────── */
export type RepaymentFrequency = 'daily' | 'weekly' | 'monthly';

/* ── Processing Fee Type ────────────────────────────────── */
export type ProcessingFeeType = 'none' | 'fixed' | 'percent';

/* ── Penalty Rule Type ──────────────────────────────────── */
export type PenaltyRuleType =
  | 'none'
  | 'fixed'
  | 'percent_of_overdue'
  | 'daily'
  | 'weekly';

/* ── Payment Method ─────────────────────────────────────── */
export type PaymentMethod = 'airtel_money' | 'mtn_mobile_money' | 'bank_transfer' | 'cash' | 'other';

/* ── Payment Status ─────────────────────────────────────── */
export type PaymentStatus = 'pending' | 'verified' | 'rejected';

/* ── Collateral Type ────────────────────────────────────── */
export type CollateralType =
  | 'vehicle'
  | 'property'
  | 'equipment'
  | 'electronics'
  | 'household_goods'
  | 'other';

/* ── Instalment Status ──────────────────────────────────── */
export type InstalmentStatus = 'upcoming' | 'due' | 'part_paid' | 'paid' | 'overdue';

/* ── Application Decision ───────────────────────────────── */
export type ApplicationDecision = 'approved' | 'rejected' | 'returned';
