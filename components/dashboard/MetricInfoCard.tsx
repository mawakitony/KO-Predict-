interface MetricInfoCardProps {
  label: string;
  value: string;
  hint?: string;
  badge?: string;
  badgeTone?: "up" | "warn" | "down";
}

export function MetricInfoCard({
  label,
  value,
  hint,
  badge,
  badgeTone = "up",
}: MetricInfoCardProps) {
  const badgeClass =
    badgeTone === "warn"
      ? "ko-dash-badge-warn"
      : badgeTone === "down"
        ? "ko-dash-badge-down"
        : "ko-dash-badge-up";

  return (
    <article className="ko-dash-kpi">
      <div className="flex items-start justify-between gap-2">
        <p className="ko-dash-kpi-label">{label}</p>
        {badge ? (
          <span className={`ko-dash-badge ${badgeClass}`}>{badge}</span>
        ) : null}
      </div>
      <p className="ko-display mt-4 text-3xl font-black tracking-tight text-slate-900">
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-slate-500">{hint}</p> : null}
    </article>
  );
}
