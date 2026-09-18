import ReportShell from '@/components/reports/ReportShell';

export default function OutstandingPage() {
  return (
    <ReportShell
      slug="outstanding"
      title="Outstanding Balances"
      subtitle="Every active loan and what is owed"
      statusOptions={['disbursed', 'performing', 'at_risk', 'overdue']}
    />
  );
}
