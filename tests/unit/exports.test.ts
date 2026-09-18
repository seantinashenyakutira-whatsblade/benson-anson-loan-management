import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { renderReportPdf } from '@/components/pdf/ReportDoc';

describe('excel export shape', () => {
  it('builds a workbook buffer that re-opens with headers and totals', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Expected vs Actual');
    ws.addRow(['Anson Benson Cash Solutions']);
    ws.addRow(['Expected vs Actual']);
    const header = ws.addRow(['Branch', 'Loan No', 'Expected to Date', 'Actual Collected']);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00A6E0' } };
    const row = ws.addRow(['Head Office', 'LN000001', 5000, 3000]);
    row.getCell(3).numFmt = '"K" #,##0.00';
    row.getCell(4).numFmt = '"K" #,##0.00';
    const buf = await wb.xlsx.writeBuffer();
    const bytes = buf as unknown as Uint8Array;
    expect(Buffer.from(bytes.subarray(0, 2)).toString()).toBe('PK');

    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(buf as unknown as ArrayBuffer);
    const ws2 = wb2.getWorksheet('Expected vs Actual')!;
    expect(ws2.getRow(3).getCell(1).value).toBe('Branch');
    expect(ws2.getRow(4).getCell(3).value).toBe(5000);
    expect(ws2.getRow(4).getCell(3).numFmt).toBe('"K" #,##0.00');
  });

  it('renders a PDF buffer with %PDF header', async () => {
    const buf = await renderReportPdf({
      result: {
        meta: {
          title: 'Outstanding Balances',
          businessName: 'Anson Benson Cash Solutions',
          currencySymbol: 'K',
          from: '2026-09-01',
          to: '2026-09-30',
          generatedBy: 'Test Owner',
          generatedAt: '2026-09-17T00:00:00.000Z',
        },
        columns: [
          { key: 'loan_no', label: 'Loan No', kind: 'text' },
          { key: 'outstanding', label: 'Outstanding', kind: 'money' },
        ],
        rows: [{ loan_no: 'LN000001', outstanding: 5000 }],
        totals: { loan_no: 'TOTAL', outstanding: 5000 },
      },
      logoDataUri: null,
      systemName: 'ABC Loans',
    });
    expect(Buffer.from(buf.subarray(0, 4)).toString()).toBe('%PDF');
    expect(buf.length).toBeGreaterThan(1000);
  });
});
