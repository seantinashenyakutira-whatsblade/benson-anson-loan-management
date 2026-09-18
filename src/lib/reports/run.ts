/**
 * reports/run.ts — Shared report runner for JSON + export routes (Phase 9.6).
 * Authenticates via cookies (RLS applies), resolves scope, runs the fetcher,
 * and attaches business context from settings.
 */
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { REPORT_REGISTRY } from '@/lib/reports/registry';
import { parseReportParams, resolveScope, type ReportResult, type ReportUser } from '@/lib/reports/types';

export interface ReportRun {
  user: ReportUser;
  result: ReportResult;
}

export async function runReport(req: Request, slug: string): Promise<ReportRun> {
  const def = REPORT_REGISTRY[slug];
  if (!def) throw new Error('Unknown report');

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: profile } = await sb.from('profiles').select('id, full_name, role, branch_id').eq('id', user.id).single();
  if (!profile) throw new Error('No profile');

  const reportUser: ReportUser = {
    id: profile.id,
    name: profile.full_name,
    role: profile.role,
    branchId: profile.branch_id,
  };

  const url = new URL(req.url);
  const reportParams = parseReportParams(url.searchParams);
  const scope = resolveScope(reportUser, reportParams);

  const { columns, rows, totals } = await def.fetcher({ sb, user: reportUser, params: reportParams, scope });

  const svc = createServiceClient();
  const { data: settings } = await svc.from('settings').select('key, value').in('key', ['business_name', 'currency_symbol']);
  const get = (k: string, fallback: string) => settings?.find((s) => s.key === k)?.value || fallback;

  return {
    user: reportUser,
    result: {
      meta: {
        title: def.title,
        businessName: get('business_name', ''),
        currencySymbol: get('currency_symbol', 'K'),
        from: reportParams.from,
        to: reportParams.to,
        generatedBy: reportUser.name,
        generatedAt: new Date().toISOString(),
      },
      columns,
      rows,
      totals,
    },
  };
}
