export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <div className="glass-card flex flex-col items-center gap-4 p-8">
        <div className="text-4xl">📡</div>
        <h1 className="text-xl font-bold text-text-primary">You&apos;re Offline</h1>
        <p className="text-sm text-text-secondary">
          Check your internet connection and try again.
        </p>
      </div>
    </div>
  );
}
