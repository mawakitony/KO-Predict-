import type { PredictionHistory } from "@/types/prediction";
import { formatDateShortFr } from "@/lib/dashboard/format";

interface ReadinessHistoryChartProps {
  history: PredictionHistory[];
}

/**
 * Graphique SVG simple (sans lib lourde) — évolution du Readiness Score.
 */
export function ReadinessHistoryChart({ history }: ReadinessHistoryChartProps) {
  const points = [...history]
    .filter((h) => h.readinessScore != null)
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  if (points.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Pas encore d&apos;historique de prédiction. L&apos;historique
        apparaîtra après les premiers calculs KO Predict™.
      </p>
    );
  }

  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 20, bottom: 36, left: 36 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const xs = points.map((_, i) =>
    points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW,
  );
  const ys = points.map((p) => {
    const score = p.readinessScore ?? 0;
    return innerH - (score / 100) * innerH;
  });

  const line = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${padding.left + x} ${padding.top + ys[i]}`)
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[20rem] max-w-3xl"
        role="img"
        aria-label="Évolution du Readiness Score"
      >
        {[0, 25, 50, 75, 100].map((tick) => {
          const y = padding.top + innerH - (tick / 100) * innerH;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-400"
                fontSize="10"
              >
                {tick}
              </text>
            </g>
          );
        })}

        <path d={line} fill="none" stroke="#2563eb" strokeWidth="2.5" />

        {points.map((p, i) => (
          <g key={p.id}>
            <circle
              cx={padding.left + xs[i]}
              cy={padding.top + ys[i]}
              r="4.5"
              fill="#1d4ed8"
            />
            <text
              x={padding.left + xs[i]}
              y={height - 12}
              textAnchor="middle"
              className="fill-slate-500"
              fontSize="10"
            >
              {formatDateShortFr(p.createdAt)}
            </text>
            <title>
              {formatDateShortFr(p.createdAt)} : {p.readinessScore} / 100
            </title>
          </g>
        ))}
      </svg>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {points.map((p) => (
          <li key={`${p.id}-legend`}>
            {formatDateShortFr(p.createdAt)} :{" "}
            <span className="font-semibold text-slate-700">
              {p.readinessScore}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
