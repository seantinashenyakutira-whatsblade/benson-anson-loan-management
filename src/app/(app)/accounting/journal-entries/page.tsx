import { redirect } from 'next/navigation';

export default function LegacyJournalRedirect() {
  redirect('/accounting/journal');
}
