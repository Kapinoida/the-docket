export default function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded bg-bg-secondary" />
        <div className="flex items-center gap-3">
          <div className="h-4 w-24 animate-pulse rounded bg-bg-secondary" />
          <div className="h-11 w-24 animate-pulse rounded-md bg-bg-secondary" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-border-default bg-bg-secondary p-4">
            <div className="h-4 w-20 animate-pulse rounded bg-bg-tertiary" />
            <div className="mt-2 h-8 w-12 animate-pulse rounded bg-bg-tertiary" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border-default bg-bg-secondary p-4">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-bg-tertiary" />
        <div className="h-32 animate-pulse rounded bg-bg-tertiary" />
      </div>

      <div>
        <div className="mb-3 h-5 w-32 animate-pulse rounded bg-bg-tertiary" />
        <div className="flex gap-2">
          <div className="h-11 w-32 animate-pulse rounded-md bg-bg-secondary" />
          <div className="h-11 w-32 animate-pulse rounded-md bg-bg-secondary" />
          <div className="h-11 w-32 animate-pulse rounded-md bg-bg-secondary" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border border-border-default bg-bg-secondary p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-4 w-3/4 animate-pulse rounded bg-bg-tertiary" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-bg-tertiary" />
              </div>
              <div className="h-6 w-16 animate-pulse rounded-full bg-bg-tertiary" />
            </div>
            <div className="mt-3 flex items-center gap-4">
              <div className="h-3 w-32 animate-pulse rounded bg-bg-tertiary" />
              <div className="h-3 w-20 animate-pulse rounded bg-bg-tertiary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
