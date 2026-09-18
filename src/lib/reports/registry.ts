/**
 * reports/registry.ts — slug → title + fetcher (Phase 9.4).
 * Export routes (9.6/9.7) consume the same registry.
 */
import type { ReportResult } from './types';
import {
  fetchExpectedVsActual,
  fetchDefaultArrears,
  fetchOutstanding,
  fetchCustomersReport,
  fetchActiveLoans,
  fetchDisbursements,
  fetchRepayments,
  fetchIncomeExpense,
  fetchOfficerPerformance,
  fetchBranchPerformance,
} from './fetchers';
import {
  fetchPenaltiesReport,
  fetchPlReport,
  fetchBalanceSheetReport,
  fetchCollectionSummary,
} from './fetchers-tier-b';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReportParams, ReportUser } from './types';

type Ctx = { sb: SupabaseClient; user: ReportUser; params: ReportParams; scope: { branchId: string; officerId: string } };
type Fetcher = (ctx: Ctx) => Promise<{ columns: ReportResult['columns']; rows: ReportResult['rows']; totals: ReportResult['totals'] }>;

export interface ReportDef {
  slug: string;
  title: string;
  subtitle: string;
  fetcher: Fetcher;
  showStatus?: string[];
}

export const REPORT_REGISTRY: Record<string, ReportDef> = {
  'expected-vs-actual': { slug: 'expected-vs-actual', title: 'Expected vs Actual', subtitle: 'Collections due vs collected per loan', fetcher: fetchExpectedVsActual },
  'default-arrears': { slug: 'default-arrears', title: 'Default Arrears', subtitle: 'Every loan with arrears above zero', fetcher: fetchDefaultArrears, showStatus: ['performing', 'at_risk', 'overdue', 'defaulted'] },
  outstanding: { slug: 'outstanding', title: 'Outstanding Balances', subtitle: 'Every active loan and what is owed', fetcher: fetchOutstanding, showStatus: ['disbursed', 'performing', 'at_risk', 'overdue'] },
  customers: { slug: 'customers', title: 'Customer Report', subtitle: 'Customers with borrowing totals', fetcher: fetchCustomersReport },
  'active-loans': { slug: 'active-loans', title: 'Active Loans', subtitle: 'Performing, at-risk and overdue loans', fetcher: fetchActiveLoans },
  disbursements: { slug: 'disbursements', title: 'Disbursements', subtitle: 'Loans disbursed in the period', fetcher: fetchDisbursements },
  repayments: { slug: 'repayments', title: 'Repayments', subtitle: 'Payments received in the period', fetcher: fetchRepayments },
  'income-expense': { slug: 'income-expense', title: 'Income & Expense', subtitle: 'Operational ledger with running balance', fetcher: fetchIncomeExpense },
  'officer-performance': { slug: 'officer-performance', title: 'Officer Performance', subtitle: 'Portfolio aggregates per officer', fetcher: fetchOfficerPerformance },
  'branch-performance': { slug: 'branch-performance', title: 'Branch Performance', subtitle: 'Portfolio aggregates per branch', fetcher: fetchBranchPerformance },
  penalties: { slug: 'penalties', title: 'Penalties Report', subtitle: 'Penalties with status and waived amounts', fetcher: fetchPenaltiesReport, showStatus: ['active', 'waived', 'paid'] },
  pl: { slug: 'pl', title: 'P&L Report', subtitle: 'Profit and loss for the period', fetcher: fetchPlReport },
  'balance-sheet': { slug: 'balance-sheet', title: 'Balance Sheet Report', subtitle: 'Assets, liabilities and equity as at date', fetcher: fetchBalanceSheetReport },
  'collection-summary': { slug: 'collection-summary', title: 'Collection Summary', subtitle: 'Daily collections per branch and officer', fetcher: fetchCollectionSummary },
};

export const TIER_A_SLUGS = Object.keys(REPORT_REGISTRY);
