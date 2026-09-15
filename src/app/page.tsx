export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <main className="glass-card flex flex-col items-center gap-6 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-primary/20 text-2xl font-bold text-accent-primary">
          BA
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Benson Anson Loans
        </h1>
        <p className="max-w-sm text-sm text-text-secondary">
          Collateral-based loan management system
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href="/auth/login"
            className="rounded-[14px] bg-accent-primary px-6 py-3 text-sm font-semibold text-accent-on-primary transition-colors hover:bg-accent-primary-hover"
          >
            Sign In
          </a>
        </div>
      </main>
    </div>
  );
}
