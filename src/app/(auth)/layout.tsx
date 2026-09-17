import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Anson Benson Cash Solutions — Sign In',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/branding/logo.png"
            alt="Anson Benson Cash Solutions"
            style={{ height: 64, width: 'auto' }}
            className="mx-auto"
          />
          <p className="mt-3 text-sm text-text-secondary">
            Loan Management
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
