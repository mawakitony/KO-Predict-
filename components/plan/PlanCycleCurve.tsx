"use client";

import { useMemo, useState } from "react";

export type PlanCurvePoint = {
  label: string;
  value: number;
  sub?: string;
  isCurrent?: boolean;
};

/** Courbe monotone (Fritsch–Carlson) — même logique que la courbe école. */
function buildMonotonePath(
  values: number[],
  width: number,
  height: number,
  padL: number,
  padR: number,
  padT: number,
  padB: number,
  min: number,
  max: number,
): { line: string; area: string; points: Array<{ x: number; y: number; v: number }> } {
  if (values.length === 0) {
    return { line: "", area: "", points: [] };
  }

  const span = Math.max(max - min, 1);
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const baseY = padT + innerH;

  const points = values.map((v, i) => {
    const x =
      padL +
      (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
    const y = padT + innerH - ((v - min) / span) * innerH;
    return { x, y, v };
  });

  if (points.length === 1) {
    const p = points[0]!;
    return {
      line: `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`,
      area: `M ${p.x.toFixed(2)} ${baseY.toFixed(2)} L ${p.x.toFixed(2)} ${p.y.toFixed(2)} Z`,
      points,
    };
  }

  const n = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1]!.x - points[i]!.x;
    dy[i] = points[i + 1]!.y - points[i]!.y;
    m[i] = dy[i]! / (dx[i]! || 1);
  }

  const slopes = new Array<number>(n);
  slopes[0] = m[0]!;
  slopes[n - 1] = m[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1]! * m[i]! <= 0) {
      slopes[i] = 0;
    } else {
      slopes[i] = (m[i - 1]! + m[i]!) / 2;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(m[i]!) < 1e-8) {
      slopes[i] = 0;
      slopes[i + 1] = 0;
    } else {
      const a = slopes[i]! / m[i]!;
      const b = slopes[i + 1]! / m[i]!;
      const s = a * a + b * b;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        slopes[i] = t * a * m[i]!;
        slopes[i + 1] = t * b * m[i]!;
      }
    }
  }

  let line = `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const cp1x = p0.x + dx[i]! / 3;
    const cp1y = p0.y + (slopes[i]! * dx[i]!) / 3;
    const cp2x = p1.x - dx[i]! / 3;
    const cp2y = p1.y + (-slopes[i + 1]! * dx[i]!) / 3;
    line += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }

  const first = points[0]!;
  const last = points[n - 1]!;
  const area = `${line} L ${last.x.toFixed(2)} ${baseY.toFixed(2)} L ${first.x.toFixed(2)} ${baseY.toFixed(2)} Z`;

  return { line, area, points };
}

function buildLinearPath(
  values: number[],
  width: number,
  height: number,
  padL: number,
  padR: number,
  padT: number,
  padB: number,
  min: number,
  max: number,
): string {
  if (values.length === 0) return "";
  const span = Math.max(max - min, 1);
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  return values
    .map((v, i) => {
      const x =
        padL +
        (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
      const y = padT + innerH - ((v - min) / span) * innerH;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function PlanCycleCurve({
  headline,
  headlineValue,
  deltaLabel,
  series,
  paceSeries,
  note,
}: {
  headline: string;
  headlineValue: string;
  deltaLabel?: string | null;
  series: PlanCurvePoint[];
  /** Courbe cible (rythme attendu), même longueur que series si fournie. */
  paceSeries?: number[];
  note?: string | null;
}) {
  const [active, setActive] = useState<number | null>(null);

  const values = series.map((s) => s.value);
  const pace = paceSeries ?? [];

  const domain = useMemo(() => {
    const all = [...values, ...pace, 0, 100];
    const rawMin = Math.min(...all);
    const rawMax = Math.max(...all);
    const min = Math.max(0, Math.floor(rawMin / 10) * 10);
    const max = Math.min(100, Math.max(100, Math.ceil(rawMax / 10) * 10));
    const ticks = [0, 25, 50, 75, 100].filter((t) => t >= min && t <= max);
    return { min, max: Math.max(max, min + 20), ticks };
  }, [values, pace]);

  const w = 920;
  const h = 280;
  const padL = 12;
  const padR = 44;
  const padT = 28;
  const padB = 40;

  const path = buildMonotonePath(
    values,
    w,
    h,
    padL,
    padR,
    padT,
    padB,
    domain.min,
    domain.max,
  );

  const pacePath =
    pace.length === values.length
      ? buildLinearPath(
          pace,
          w,
          h,
          padL,
          padR,
          padT,
          padB,
          domain.min,
          domain.max,
        )
      : "";

  const activePoint =
    active != null && path.points[active] ? path.points[active] : null;
  const activeMeta = active != null ? series[active] : null;
  const tipLeft = activePoint
    ? Math.min(88, Math.max(12, (activePoint.x / w) * 100))
    : 50;

  const yFor = (v: number) => {
    const span = Math.max(domain.max - domain.min, 1);
    const innerH = h - padT - padB;
    return padT + innerH - ((v - domain.min) / span) * innerH;
  };

  return (
    <section className="ko-plan-curve" aria-labelledby="plan-curve-metric">
      <div className="ko-plan-curve-top">
        <div>
          <p className="ko-plan-curve-kicker">{headline}</p>
          <div className="ko-plan-curve-value-row">
            <h2 id="plan-curve-metric" className="ko-plan-curve-value">
              {headlineValue}
            </h2>
            {deltaLabel ? (
              <span className="ko-plan-curve-delta">{deltaLabel}</span>
            ) : null}
          </div>
        </div>
        <div className="ko-plan-curve-legend" aria-hidden>
          <span className="ko-plan-curve-leg is-actual">Avancement réel</span>
          {pacePath ? (
            <span className="ko-plan-curve-leg is-pace">Rythme cible</span>
          ) : null}
        </div>
      </div>

      <div className="ko-plan-curve-plot" onMouseLeave={() => setActive(null)}>
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="ko-plan-curve-svg"
          role="img"
          aria-label="Courbe d'avancement du plan"
        >
          <defs>
            <linearGradient id="ko-plan-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.28" />
              <stop offset="70%" stopColor="#14b8a6" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {domain.ticks.map((tick) => {
            const y = yFor(tick);
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  x2={w - padR}
                  y1={y}
                  y2={y}
                  className="ko-plan-curve-grid"
                />
                <text x={w - padR + 10} y={y + 4} className="ko-plan-curve-yaxis">
                  {tick}
                </text>
              </g>
            );
          })}

          {path.area ? (
            <path d={path.area} fill="url(#ko-plan-area)" className="ko-plan-curve-fill" />
          ) : null}

          {pacePath ? (
            <path
              d={pacePath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="2"
              strokeDasharray="5 6"
              strokeLinecap="round"
              className="ko-plan-curve-pace"
            />
          ) : null}

          {path.line ? (
            <path
              d={path.line}
              fill="none"
              stroke="#0d9488"
              strokeWidth="3.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ko-plan-curve-line"
            />
          ) : null}

          {path.points.map((p, i) => {
            const isActive = active === i;
            const meta = series[i];
            return (
              <g key={`pt-${i}`}>
                <rect
                  x={
                    i === 0
                      ? padL
                      : (path.points[i - 1]!.x + p.x) / 2
                  }
                  y={padT - 8}
                  width={
                    i === 0
                      ? Math.max(28, (p.x + (path.points[1]?.x ?? p.x)) / 2 - padL)
                      : i === path.points.length - 1
                        ? w - padR - (path.points[i - 1]!.x + p.x) / 2
                        : (path.points[i + 1]!.x - path.points[i - 1]!.x) / 2
                  }
                  height={h - padT - padB + 16}
                  fill="transparent"
                  onMouseEnter={() => setActive(i)}
                />
                <text
                  x={p.x}
                  y={p.y - 14}
                  textAnchor="middle"
                  className={`ko-plan-curve-point-label${isActive ? " is-active" : ""}`}
                >
                  {Math.round(p.v)}%
                </text>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive || meta?.isCurrent ? 7 : 5.25}
                  fill="#fff"
                  stroke={meta?.isCurrent ? "#0f766e" : "#0d9488"}
                  strokeWidth={isActive || meta?.isCurrent ? 3.1 : 2.5}
                  className="ko-plan-curve-dot"
                  style={{ animationDelay: `${50 + i * 40}ms` }}
                />
                <text
                  x={p.x}
                  y={h - 12}
                  textAnchor="middle"
                  className={`ko-plan-curve-xaxis${isActive || meta?.isCurrent ? " is-active" : ""}`}
                >
                  {meta?.label ?? ""}
                </text>
              </g>
            );
          })}

          {activePoint ? (
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={padT}
              y2={h - padB}
              className="ko-plan-curve-crosshair"
            />
          ) : null}
        </svg>

        {activePoint && activeMeta ? (
          <div
            className="ko-plan-curve-tooltip"
            style={{
              left: `${tipLeft}%`,
              top: `${(activePoint.y / h) * 100}%`,
            }}
          >
            <p className="ko-plan-curve-tip-date">{activeMeta.label}</p>
            <p className="ko-plan-curve-tip-value">
              {Math.round(activeMeta.value)}
              <span>%</span>
            </p>
            {activeMeta.sub ? (
              <p className="ko-plan-curve-tip-sub">{activeMeta.sub}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      {note ? <p className="ko-plan-curve-note">{note}</p> : null}
    </section>
  );
}
