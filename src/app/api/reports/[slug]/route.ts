import { NextResponse } from 'next/server';
import { runReport } from '@/lib/reports/run';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { result } = await runReport(req, slug);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Report failed';
    const status = message === 'Unauthorized' ? 401 : message === 'No profile' ? 403 : message === 'Unknown report' ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
