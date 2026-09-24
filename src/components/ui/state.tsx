export function EmptyState({ icon: Icon, title, description, action }: { icon?: React.ElementType; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface-glass text-text-muted">
          <Icon size={24} />
        </div>
      )}
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ variant = 'skeleton' }: { variant?: 'skeleton' | 'spinner' | 'bar' }) {
  if (variant === 'spinner') {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
      </div>
    );
  }
  if (variant === 'bar') {
    return <div className="h-1 w-full overflow-hidden rounded bg-surface-glass"><div className="h-full w-1/3 animate-[shimmer_1s_infinite] bg-accent-primary" /></div>;
  }
  return (
    <div className="space-y-2 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded bg-surface-glass" />
      ))}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', description, retry }: { title?: string; description?: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <h3 className="text-sm font-semibold text-danger">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-text-muted">{description}</p>}
      {retry && (
        <button onClick={retry} className="mt-4 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-accent-on-primary">
          Try again
        </button>
      )}
    </div>
  );
}
