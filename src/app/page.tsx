import type { Metadata } from 'next';
import { LandingSections } from './(marketing)/components/landing-sections';

export const metadata: Metadata = {
  title: 'Anson Benson Cash Solutions — Fast Collateral Loans in Zambia',
  description:
    'Fast, fair loans against vehicles, electronics, appliances and more. Apply online in minutes.',
  openGraph: {
    title: 'Anson Benson Cash Solutions',
    description: 'Cash when you need it. Keep what matters.',
    images: ['/branding/logo-icon.png'],
  },
  icons: { icon: '/branding/logo-icon.png' },
};

export default function LandingPage() {
  return <LandingSections />;
}
