import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { runReport } from '@/lib/reports/run';
import { renderReportPdf } from '@/components/pdf/ReportDoc';

/**
 * GET /api/reports/[slug]/export/pdf?from&to&branch&officer&status
 * Server-side branded PDF using the light-background client logo.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const { result } = await runReport(req, slug);

    let logoDataUri: string | null = null;
    try {
      const buf = await readFile(join(process.cwd(), 'public', 'branding', 'logo-on-light.png'));
      logoDataUri = `data:image/png;base64,${buf.toString('base64')}`;
    } catch {
      logoDataUri = null;
    }

    const pdf = await renderReportPdf({ result, logoDataUri, systemName: 'ABC Loans' });
    const filename = `${slug}-${result.meta.from}-to-${result.meta.to}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'PDF export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
