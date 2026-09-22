import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { LandingSections } from './components/landing-sections';
import type { ProductInfo } from './components/use-business';

/**
 * Landing products, fetched on the server and cached for 1 hour.
 * Uses the anon key (same RLS as the old client fetch) and no cookies,
 * so the result is safely cacheable.
 */
const getLandingProducts = unstable_cache(
  async (): Promise<ProductInfo[]> => {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from('loan_products')
      .select('id, name, description, min_amount, max_amount, interest_rate, interest_type, default_duration, duration_unit')
      .eq('is_active', true)
      .order('min_amount', { ascending: true });
    return (data as unknown as ProductInfo[]) ?? [];
  },
  ['landing-products'],
  { revalidate: 3600, tags: ['landing-products'] },
);

export default async function LandingPage() {
  const products = await getLandingProducts();
  return <LandingSections products={products} />;
}
