interface ProgressCardProps {
  progressPercent: number | null;
  completedActivities: number;
  totalActivities: number;
}

export function ProgressCard({
  progressPercent,
  completedActivities,
  totalActivities,
}: ProgressCardProps) {
  const value =
    progressPercent != null
      ? `${Math.round(progressPercent)} %`
      : "Donnée insuffisante";
  const width =
    progressPercent != null ? Math.min(100, Math.max(0, progressPercent)) : 0;

  return (
    <article className="ko-dash-kpi">
      <div className="flex items-start justify-between gap-2">
        <p className="ko-dash-kpi-label">Progression</p>
        {progressPercent != null ? (
          <span className="ko-dash-badge ko-dash-badge-up">
            {Math.round(progressPercent)}%
          </span>
        ) : null}
      </div>
      <p className="ko-display mt-4 text-3xl font-black tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">
        {completedActivities} / {totalActivities} activités
      </p>
      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-[var(--dash-primary)] transition-[width] duration-500 ease-out"
          style={{ width: `${width}%` }}
        />
      </div>
    </article>
  );
}
