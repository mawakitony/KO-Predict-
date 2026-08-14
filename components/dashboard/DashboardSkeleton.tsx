export function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl animate-pulse space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-8 w-40 rounded bg-slate-200" />
      <div className="h-7 w-56 rounded bg-slate-200" />
      <div className="h-40 rounded-2xl bg-slate-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-200" />
        ))}
      </div>
      <div className="h-28 rounded-2xl bg-slate-200" />
      <div className="h-32 rounded-2xl bg-slate-200" />
    </div>
  );
}
