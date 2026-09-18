/**
 * reports/types.ts — Shared report contracts (Phase 9.4).
 * API routes return ReportResult; pages render it generically.
 * Money values travel as raw kwacha numbers; the client formats them.
 */

export interface ReportUser {
  id: string;
  name: string;
  role: 'owner' | 'branch_manager' | 'loan_officer' | 'cashier';
  branchId: string | null;
}

export interface ReportParams {
  from: string;
  to: string;
  branchId: string; // 'all' or branch uuid
  officerId: string; // 'all' or profile uuid
  status: string; // 'all' or status value
}

export type ColumnKind = 'text' | 'money' | 'number' | 'date';

export interface ReportColumn {
  key: string;
  label: string;
  kind: ColumnKind;
}

export type ReportRow = Record<string, string | number | null>;

export interface ReportMeta {
  title: string;
  businessName: string;
  currencySymbol: string;
  from: string;
  to: string;
  generatedBy: string;
  generatedAt: string;
}

export interface ReportResult {
  meta: ReportMeta;
  columns: ReportColumn[];
  rows: ReportRow[];
  totals?: ReportRow;
}

/** Parse and sanitize query params with sane defaults (current month). */
export function parseReportParams(search: URLSearchParams): ReportParams {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]!;
  const last = today.toISOString().split('T')[0]!;
  const iso = (v: string | null, fallback: string) =>
    v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : fallback;
  return {
    from: iso(search.get('from'), first),
    to: iso(search.get('to'), last),
    branchId: search.get('branch') || 'all',
    officerId: search.get('officer') || 'all',
    status: search.get('status') || 'all',
  };
}

/**
 * Resolve effective scope: owners may filter freely; everyone else is
 * pinned to their own branch, and loan officers to themselves.
 */
export function resolveScope(user: ReportUser, params: ReportParams): { branchId: string; officerId: string } {
  if (user.role === 'owner') return { branchId: params.branchId, officerId: params.officerId };
  if (user.role === 'loan_officer') return { branchId: user.branchId || 'all', officerId: user.id };
  return { branchId: user.branchId || 'all', officerId: params.officerId };
}
