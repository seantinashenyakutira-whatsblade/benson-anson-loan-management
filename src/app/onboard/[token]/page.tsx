import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { OnboardForm, type InvitationInfo } from './onboard-form';
import type { OnboardProduct } from '@/lib/validations/onboarding';

function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

function ExpiredPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg-base p-4">
      <div className="glass-card w-full max-w-md p-8 text-center">
        <p className="lp-eyebrow">Anson Benson Cash Solutions</p>
        <h1 className="mt-3 text-2xl font-bold text-text-primary">This link is no longer valid</h1>
        <p className="mt-2 text-sm text-text-secondary">
          The invitation has expired or was already used. Ask your loan officer for a fresh link.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-[var(--radius-button)] bg-accent-primary px-6 py-3 text-sm font-medium text-accent-on-primary hover:bg-accent-primary-hover"
        >
          Return to website
        </Link>
      </div>
    </div>
  );
}

export default async function OnboardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = anonClient();

  const [{ data: invitation }, { data: products }] = await Promise.all([
    supabase.rpc('rpc_get_invitation_by_token', { p_token: token }),
    supabase
      .from('loan_products')
      .select('id, name, interest_rate, interest_type, min_amount, max_amount, default_duration, duration_unit, repayment_frequency')
      .eq('is_active', true)
      .order('min_amount'),
  ]);

  if (!invitation) {
    return <ExpiredPage />;
  }

  return (
    <OnboardForm
      token={token}
      invitation={invitation as InvitationInfo}
      products={(products ?? []) as OnboardProduct[]}
    />
  );
}
