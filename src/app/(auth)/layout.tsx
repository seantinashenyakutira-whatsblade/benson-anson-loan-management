import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Benson Anson Loans — Sign In',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-text-primary">
            Benson Anson Loans
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Collateral-based loan management
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
