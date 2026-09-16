'use server';

import { createClient } from '@/lib/supabase/server';

export interface ForgotPasswordState {
  error: string | null;
  success: boolean;
}

export async function forgotPassword(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required.', success: false };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: null, success: true };
}
