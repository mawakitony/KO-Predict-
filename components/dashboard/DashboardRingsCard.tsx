/** Anneaux de synthèse — style product statistic. */
export function DashboardRingsCard({
  readiness,
  progress,
  probability,
}: {
  readiness: number | null;
  progress: number | null;
  probability: number | null;
}) {
  const items = [
    {
      label: "Préparation",
      value: readiness,
      color: "#2563eb",
      track: "#e8eefc",
    },
    {
      label: "Progression",
      value: progress,
      color: "#60a5fa",
      track: "#eef2ff",
    },
    {
      label: "Probabilité",
      value: probability,
      color: "#94a3b8",
      track: "#f1f5f9",
    },
  ] as const;

  const center = readiness != null ? Math.round(readiness) : null;

  return (
    <article className="ko-dash-card flex h-full min-h-[22rem] flex-col p-6 sm:p-7">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="ko-display text-lg font-bold text-slate-900">
            Statistiques
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Indicateurs clés KO Predict™
          </p>
        </div>
      </div>

      <div className="relative mx-auto mt-5 flex h-48 w-48 items-center justify-center">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
          {items.map((item, index) => {
            const radius = 48 - index * 12;
            const circ = 2 * Math.PI * radius;
            const pct =
              item.value != null
                ? Math.min(100, Math.max(0, item.value)) / 100
                : 0;
            return (
              <g key={item.label}>
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={item.track}
                  strokeWidth="9"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={`${pct * circ} ${circ}`}
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="ko-display text-3xl font-black text-slate-900">
            {center ?? "—"}
          </p>
          <p className="text-[11px] font-semibold text-slate-400">
            Préparation
          </p>
        </div>
      </div>

      <ul className="mt-auto space-y-3 border-t border-slate-100 pt-4">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex items-center gap-2.5 font-medium text-slate-600">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{ background: `${item.color}18` }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: item.color }}
                />
              </span>
              {item.label}
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="ko-display font-bold text-slate-900">
                {item.value != null ? Math.round(item.value) : "—"}
              </span>
              {item.value != null ? (
                <span className="ko-dash-badge ko-dash-badge-up">
                  {Math.round(item.value)}%
                </span>
              ) : (
                <span className="ko-dash-badge ko-dash-badge-warn">N/A</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
