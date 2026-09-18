import ReportShell from '@/components/reports/ReportShell';

export default function PenaltiesReportPage() {
  return (
    <ReportShell
      slug="penalties"
      title="Penalties Report"
      subtitle="Penalties with status and waived amounts"
      statusOptions={['active', 'waived', 'paid']}
    />
  );
}
