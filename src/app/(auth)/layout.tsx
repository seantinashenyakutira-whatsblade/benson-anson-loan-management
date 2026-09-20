import type { Metadata } from 'next';
import { BrandMark } from '@/components/layout/brand-mark';

export const metadata: Metadata = {
  title: 'Anson Benson Cash Solutions — Sign In',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark variant="full" height={64} lightImage />
          <p className="mt-3 text-sm text-text-secondary">
            Loan Management
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
