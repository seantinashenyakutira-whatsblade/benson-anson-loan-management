import { redirect } from 'next/navigation';

/**
 * Loans are always created by converting approved applications.
 * This route is kept so old links land on the application flow.
 */
export default function LoansNewRedirect() {
  redirect('/applications/new');
}
