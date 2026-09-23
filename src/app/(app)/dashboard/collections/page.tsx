import { redirect } from 'next/navigation';

export default async function DashboardCollectionsRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((val) => qs.append(k, val));
    else if (v) qs.set(k, v);
  }
  const suffix = qs.toString();
  redirect(`/collections${suffix ? `?${suffix}` : ''}`);
}
