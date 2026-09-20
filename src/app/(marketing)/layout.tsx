import type { Metadata } from 'next';
import { Geist, Instrument_Serif } from 'next/font/google';
import './marketing.css';

const display = Geist({
  variable: '--lp-font-display',
  subsets: ['latin'],
  weight: ['700', '800'],
  display: 'swap',
});

const accent = Instrument_Serif({
  variable: '--lp-font-accent',
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Anson Benson Cash Solutions — Fast Collateral Loans in Zambia',
  description:
    'Turn your needs into reality with Anson Benson Cash Solutions Limited. Fast, fair loans against vehicles, electronics, appliances and more. K500 – K30,000.',
  openGraph: {
    title: 'Anson Benson Cash Solutions',
    description: 'Your needs, our support. Cash when you need it — keep what matters.',
    images: ['/branding/logo-icon.png'],
  },
  icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`lp-root ${display.variable} ${accent.variable}`}>{children}</div>
  );
}