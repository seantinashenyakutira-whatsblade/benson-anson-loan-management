import { redirect } from 'next/navigation';

export default async function DashboardHealthRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const range = typeof params.range === 'string' ? params.range : Array.isArray(params.range) ? params.range[0] : undefined;
  redirect(`/reports${range ? `?range=${encodeURIComponent(range)}` : ''}`);
}
