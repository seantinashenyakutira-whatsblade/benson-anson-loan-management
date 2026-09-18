import ReportShell from '@/components/reports/ReportShell';

export default function DefaultArrearsPage() {
  return (
    <ReportShell
      slug="default-arrears"
      title="Default Arrears"
      subtitle="Every loan with arrears above zero"
      statusOptions={['performing', 'at_risk', 'overdue', 'defaulted']}
    />
  );
}
