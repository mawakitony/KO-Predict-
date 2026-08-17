"use client";

import { useMemo, useState } from "react";
import type { SchoolTrendPoint } from "@/lib/admin/school-overview";

type RangeKey = "7j" | "14j" | "30j" | "All";

/** Courbe monotone (sans dépassement) — plus fiable à lire qu’un Catmull-Rom. */
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
): { line: string; points: Array<{ x: number; y: number; v: number }> } {
  if (values.length === 0) {
    return { line: "", points: [] };
  }

  const span = Math.max(max - min, 1);
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const points = values.map((v, i) => {
    const x =
      padL +
      (values.length === 1 ? innerW / 2 : (i / (values.length - 1)) * innerW);
    const y = padT + innerH - ((v - min) / span) * innerH;
    return { x, y, v };
  });

  if (points.length === 1) {
    return {
      line: `M ${points[0]!.x.toFixed(2)} ${points[0]!.y.toFixed(2)}`,
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

  // Fritsch–Carlson : empêche les bosses hors données
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
    const cp2y = p1.y - (slopes[i + 1]! * dx[i]!) / 3;
    line += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
  }

  return { line, points };
}

function niceDomain(values: number[]): { min: number; max: number; ticks: number[] } {
  if (values.length === 0) return { min: 0, max: 100, ticks: [0, 25, 50, 75, 100] };
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max((rawMax - rawMin) * 0.16, 6);
  let min = Math.max(0, Math.floor((rawMin - pad) / 5) * 5);
  let max = Math.min(100, Math.ceil((rawMax + pad) / 5) * 5);
  if (max - min < 20) {
    const mid = (min + max) / 2;
    min = Math.max(0, Math.floor((mid - 12) / 5) * 5);
    max = Math.min(100, Math.ceil((mid + 12) / 5) * 5);
  }
  if (max <= min) max = min + 20;
  const step = (max - min) / 4;
  const ticks = [0, 1, 2, 3, 4].map((i) => Math.round(min + step * i));
  return { min, max, ticks };
}

function sliceByRange<T>(items: T[], range: RangeKey): T[] {
  if (range === "All") return items;
  const n = range === "7j" ? 7 : range === "14j" ? 14 : 30;
  return items.slice(-n);
}

const DEMO_SERIES = [
  { label: "01/08", value: 44 },
  { label: "03/08", value: 49 },
  { label: "05/08", value: 55 },
  { label: "07/08", value: 61 },
  { label: "09/08", value: 68 },
  { label: "10/08", value: 74 },
  { label: "11/08", value: 82 },
  { label: "12/08", value: 61 },
];

export function SchoolHeroChart({
  trends,
  headline,
  headlineValue,
}: {
  trends: SchoolTrendPoint[];
  headline: string;
  headlineValue: string;
  deltaLabel?: string | null;
}) {
  const [range, setRange] = useState<RangeKey>("7j");
  const [active, setActive] = useState<number | null>(null);

  const series = useMemo(() => {
    const sliced = sliceByRange(trends, range);
    const hasData = sliced.some(
      (t) => t.avgReadiness != null || t.avgProbability != null,
    );
    if (hasData) {
      return sliced.map((t) => ({
        label: t.label,
        value: t.avgReadiness ?? t.avgProbability ?? 0,
        readiness: t.avgReadiness,
        probability: t.avgProbability,
        progress: t.avgProgress,
        real: true as const,
      }));
    }
    return sliceByRange(DEMO_SERIES, range).map((d) => ({
      label: d.label,
      value: d.value,
      readiness: d.value,
      probability: Math.min(100, d.value - 6),
      progress: Math.max(12, d.value - 18),
      real: false as const,
    }));
  }, [trends, range]);

  const values = series.map((s) => s.value);
  const domain = niceDomain(values);

  const deltaPct = useMemo(() => {
    if (values.length < 2) return null;
    const first = values[0]!;
    const last = values[values.length - 1]!;
    if (first === 0) return null;
    return ((last - first) / Math.abs(first)) * 100;
  }, [values]);

  const w = 960;
  const h = 300;
  const padL = 8;
  const padR = 46;
  const padT = 28;
  const padB = 42;

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

  const activePoint =
    active != null && path.points[active] ? path.points[active] : null;
  const activeMeta = active != null ? series[active] : null;
  const showValueLabels = series.length <= 10;

  const yFor = (v: number) => {
    const span = Math.max(domain.max - domain.min, 1);
    const innerH = h - padT - padB;
    return padT + innerH - ((v - domain.min) / span) * innerH;
  };

  const tipLeft = activePoint
    ? Math.min(90, Math.max(10, (activePoint.x / w) * 100))
    : 50;

  return (
    <section className="ko-curve" aria-labelledby="school-hero-metric">
      <div className="ko-curve-top">
        <div>
          <p className="ko-curve-kicker">{headline}</p>
          <div className="ko-curve-value-row">
            <h2 id="school-hero-metric" className="ko-curve-value">
              {headlineValue}
            </h2>
            {deltaPct != null ? (
              <span className={`ko-curve-delta ${deltaPct >= 0 ? "is-up" : "is-down"}`}>
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                  {deltaPct >= 0 ? (
                    <path d="M8 3.5 12.5 9h-9L8 3.5Z" />
                  ) : (
                    <path d="M8 12.5 3.5 7h9L8 12.5Z" />
                  )}
                </svg>
                {deltaPct >= 0 ? "+" : ""}
                {deltaPct.toFixed(1)} %
              </span>
            ) : null}
          </div>
        </div>

        <div className="ko-curve-controls">
          <div className="ko-curve-range" role="group" aria-label="Période">
            {(["7j", "14j", "30j", "All"] as RangeKey[]).map((key) => (
              <button
                key={key}
                type="button"
                className={range === key ? "is-active" : undefined}
                onClick={() => {
                  setRange(key);
                  setActive(null);
                }}
              >
                {key}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ko-curve-plot" onMouseLeave={() => setActive(null)}>
        <svg
          key={range}
          viewBox={`0 0 ${w} ${h}`}
          className="ko-curve-svg"
          role="img"
          aria-label="Évolution de la préparation moyenne"
        >
          {domain.ticks.map((tick) => {
            const y = yFor(tick);
            return (
              <g key={tick}>
                <line
                  x1={padL}
                  x2={w - padR}
                  y1={y}
                  y2={y}
                  className="ko-curve-grid"
                />
                <text x={w - padR + 10} y={y + 4} className="ko-curve-yaxis">
                  {tick}
                </text>
              </g>
            );
          })}

          {path.line ? (
            <path
              d={path.line}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              className="ko-curve-line"
            />
          ) : null}

          {path.points.map((p, i) => {
            const isActive = active === i;
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
                  className="ko-curve-hit"
                  onMouseEnter={() => setActive(i)}
                />

                {showValueLabels ? (
                  <text
                    x={p.x}
                    y={p.y - 14}
                    textAnchor="middle"
                    className={`ko-curve-point-label${isActive ? " is-active" : ""}`}
                  >
                    {Math.round(p.v)}
                  </text>
                ) : null}

                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 7 : 5.5}
                  fill="var(--surface)"
                  stroke="var(--accent)"
                  strokeWidth={isActive ? 3.25 : 2.75}
                  className="ko-curve-dot"
                  style={{ animationDelay: `${60 + i * 35}ms` }}
                />
              </g>
            );
          })}

          {activePoint ? (
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1={padT}
              y2={h - padB}
              className="ko-curve-crosshair"
            />
          ) : null}

          {series.map((s, i) => {
            const show =
              series.length <= 8 ||
              i === 0 ||
              i === series.length - 1 ||
              i % Math.ceil(series.length / 5) === 0;
            if (!show || !path.points[i]) return null;
            return (
              <text
                key={`xl-${s.label}-${i}`}
                x={path.points[i]!.x}
                y={h - 12}
                textAnchor="middle"
                className={`ko-curve-xaxis${active === i ? " is-active" : ""}`}
              >
                {s.label}
              </text>
            );
          })}
        </svg>

        {activePoint && activeMeta ? (
          <div
            className="ko-curve-tooltip"
            style={{
              left: `${tipLeft}%`,
              top: `${(activePoint.y / h) * 100}%`,
            }}
          >
            <p className="ko-curve-tip-date">{activeMeta.label}</p>
            <p className="ko-curve-tip-value">
              {Math.round(activeMeta.value)}
              <span> pts</span>
            </p>
            {activeMeta.probability != null ? (
              <p className="ko-curve-tip-sub">
                Prob. {Math.round(activeMeta.probability)} %
              </p>
            ) : null}
            {activeMeta.progress != null ? (
              <p className="ko-curve-tip-sub">
                Progression {Math.round(activeMeta.progress)} %
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {!series[0]?.real ? (
        <p className="ko-curve-note">
          Courbe illustrative — l&apos;historique réel apparaîtra après les
          synchronisations LearnWorlds.
        </p>
      ) : null}
    </section>
  );
}
