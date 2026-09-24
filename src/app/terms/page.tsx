import Link from 'next/link';

export const metadata = {
  title: 'Terms and Conditions — Anson Benson Cash Solutions',
};

const POINTS = [
  'Loans are granted against collateral you own and can prove ownership of.',
  'Interest, fees and penalties follow the loan product terms shown to you before disbursement.',
  'You consent to credit and background checks as part of your application.',
  'You must provide accurate information; false statements may lead to rejection or legal action.',
  'Missed payments attract penalties after the grace period stated on your product.',
  'Your collateral is held securely and released in full once the loan is fully repaid.',
  'Your personal data is used only for lending decisions and account management.',
];

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-bg-base px-4 py-10">
      <div className="glass-card mx-auto w-full max-w-2xl space-y-4 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-primary">Anson Benson Cash Solutions</p>
        <h1 className="text-2xl font-bold text-white">Terms and Conditions</h1>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-200">
          {POINTS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <Link href="/" className="inline-block rounded-xl bg-accent-primary px-6 py-3 text-sm font-bold text-accent-on-primary">
          Return to website
        </Link>
      </div>
    </div>
  );
}
