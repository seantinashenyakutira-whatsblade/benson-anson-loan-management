import type { Metadata, Viewport } from 'next';
import { Inter, Geist_Mono } from 'next/font/google';
import { ServiceWorkerRegistration } from '@/components/layout/service-worker-registration';
import { AppThemeProvider } from '@/components/layout/theme-provider';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Anson Benson Cash Solutions — Loan Management',
  description:
    'Collateral-based loan management system for Anson Benson Cash Solutions Limited',
  applicationName: 'ABC Loans',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ABC Loans',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#061633',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${geistMono.variable}`}>
      <body>
        <AppThemeProvider>
          <ServiceWorkerRegistration />
          {children}
        </AppThemeProvider>
      </body>
    </html>
  );
}
