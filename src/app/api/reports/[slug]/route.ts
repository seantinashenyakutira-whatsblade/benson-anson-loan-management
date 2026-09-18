import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { REPORT_REGISTRY } from '@/lib/reports/registry';
import { parseReportParams, resolveScope, type ReportUser } from '@/lib/reports/types';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const def = REPORT_REGISTRY[slug];
  if (!def) return NextResponse.json({ error: 'Unknown report' }, { status: 404 });

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await sb.from('profiles').select('id, full_name, role, branch_id').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 403 });

  const reportUser: ReportUser = {
    id: profile.id,
    name: profile.full_name,
    role: profile.role,
    branchId: profile.branch_id,
  };

  const url = new URL(req.url);
  const reportParams = parseReportParams(url.searchParams);
  const scope = resolveScope(reportUser, reportParams);

  try {
    const { columns, rows, totals } = await def.fetcher({ sb, user: reportUser, params: reportParams, scope });

    // Business context from settings (never hardcoded)
    const svc = createServiceClient();
    const { data: settings } = await svc.from('settings').select('key, value').in('key', ['business_name', 'currency_symbol']);
    const get = (k: string, fallback: string) => settings?.find((s) => s.key === k)?.value || fallback;

    return NextResponse.json({
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
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Report failed' }, { status: 500 });
  }
}
