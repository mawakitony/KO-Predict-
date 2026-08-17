"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/translate";

interface LearnerStatRingsProps {
  readiness: number | null;
  probability: number | null;
  progress: number | null;
  currentPace?: number | null;
  requiredPace?: number | null;
}

type MetricKey = "readiness" | "probability" | "progress" | "pace";

const METRICS: Array<{
  key: MetricKey;
  labelKey: MessageKey;
  unit: "pts" | "%" | "week";
  color: string;
  soft: string;
  Icon: (props: { color: string }) => ReactNode;
}> = [
  {
    key: "readiness",
    labelKey: "admin.file.preparation",
    unit: "pts",
    color: "var(--brand)",
    soft: "var(--brand-soft)",
    Icon: IconShield,
  },
  {
    key: "probability",
    labelKey: "admin.file.probability",
    unit: "%",
    color: "var(--accent)",
    soft: "var(--accent-soft)",
    Icon: IconTarget,
  },
  {
    key: "progress",
    labelKey: "admin.file.progress",
    unit: "%",
    color: "var(--info)",
    soft: "var(--info-soft)",
    Icon: IconTrend,
  },
  {
    key: "pace",
    labelKey: "admin.file.activityPace",
    unit: "week",
    color: "var(--violet)",
    soft: "var(--violet-soft)",
    Icon: IconPulse,
  },
];

function IconShield({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" aria-hidden>
      <path
        d="M12 3.5 5.5 6.2v5.3c0 4.1 2.7 7.1 6.5 8.5 3.8-1.4 6.5-4.4 6.5-8.5V6.2L12 3.5Z"
        stroke={color}
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M9.2 12.1 11 13.9l3.8-3.9" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTarget({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="7.5" stroke={color} strokeWidth="1.9" />
      <circle cx="12" cy="12" r="3.6" stroke={color} strokeWidth="1.9" />
      <circle cx="12" cy="12" r="1.1" fill={color} />
    </svg>
  );
}

function IconTrend({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" aria-hidden>
      <path d="M4 16.5 9.2 11l3.4 3.3L20 7.5" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 7.5H20V13" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPulse({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem]" fill="none" aria-hidden>
      <path
        d="M3.5 12h3.2l1.8-4.2 3.2 8.4 2.2-4.2H20.5"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function sparkPoints(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = Math.max(max - min, 1);
  return values.map((v, i) => {
    const x = (i / Math.max(values.length - 1, 1)) * width;
    const y = height - ((v - min) / span) * (height - 6) - 3;
    return { x, y };
  });
}

/** Courbe lissée (Catmull-Rom → cubic). */
function smoothPath(values: number[], width = 84, height = 32): string {
  const pts = sparkPoints(values, width, height);
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function smoothArea(values: number[], width = 84, height = 32): string {
  const line = smoothPath(values, width, height);
  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

function buildSpark(end: number, empty: boolean): number[] {
  if (empty) return [8, 10, 9, 12, 11, 13, 12];
  const start = Math.max(end * 0.42, end * 0.2);
  return Array.from({ length: 8 }, (_, i) => {
    const t = i / 7;
    const ease = t * t * (3 - 2 * t);
    return start + (end - start) * ease + Math.sin(t * Math.PI * 2.2) * end * 0.045;
  });
}

type Pt = { x: number; y: number };

/** Courbe fermée organique (Cardinal). */
function organicRadarPath(pts: Pt[]): string {
  if (pts.length < 3) return "";
  const n = pts.length;
  const get = (i: number) => pts[(i + n) % n];
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    if (i === 0) d += `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return `${d} Z`;
}

function RadarChart({
  actual,
  target,
  labels,
  emphasize,
}: {
  actual: number[];
  target: number[];
  labels: Array<{ name: string; value: string }>;
  emphasize: "actuel" | "objectif";
}) {
  const { t } = useLanguage();
  const gid = useId().replace(/:/g, "");
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 96;
  const levels = [1, 0.72, 0.44];
  const n = labels.length;

  const point = (value: number, i: number): Pt => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = (Math.max(0, Math.min(100, value)) / 100) * radius;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    };
  };

  const axisEnd = (i: number, r = radius) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return {
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
      angle,
    };
  };

  const actualPts = actual.map((v, i) => point(v, i));
  const targetPts = target.map((v, i) => point(v, i));
  const actualPath = organicRadarPath(actualPts);
  const targetPath = organicRadarPath(targetPts);

  const actualOpacity = emphasize === "actuel" ? 1 : 0.28;
  const targetOpacity = emphasize === "objectif" ? 1 : 0.55;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="ko-analysis-radar"
      role="img"
      aria-label={t("learner.rings.radarAria")}
    >
      <defs>
        <filter
          id={`soft-ring-${gid}`}
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="5"
            floodColor="var(--text-secondary)"
            floodOpacity="0.18"
          />
        </filter>
        <filter
          id={`glow-a-${gid}`}
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="3.5"
            floodColor="var(--brand)"
            floodOpacity="0.45"
          />
        </filter>
        <filter
          id={`glow-t-${gid}`}
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
        >
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="3.5"
            floodColor="var(--accent)"
            floodOpacity="0.4"
          />
        </filter>
        <linearGradient id={`stroke-a-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--info)" />
          <stop offset="55%" stopColor="var(--brand)" />
          <stop offset="100%" stopColor="var(--brand-hover)" />
        </linearGradient>
        <linearGradient id={`stroke-t-${gid}`} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-hover)" />
        </linearGradient>
      </defs>

      {/* Cercles empilés soft / neumorphiques */}
      {levels.map((scale, i) => (
        <circle
          key={`ring-${i}`}
          cx={cx}
          cy={cy}
          r={radius * scale}
          fill="var(--surface)"
          filter={`url(#soft-ring-${gid})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={radius * 0.18} fill="var(--surface)" />

      {labels.map((_, i) => {
        const p = axisEnd(i);
        return (
          <line
            key={`axis-${i}`}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="var(--border)"
            strokeWidth="1"
            strokeOpacity="0.7"
          />
        );
      })}

      <path
        d={targetPath}
        fill="none"
        stroke={`url(#stroke-t-${gid})`}
        strokeWidth="2.6"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#glow-t-${gid})`}
        opacity={targetOpacity}
        className="ko-analysis-poly"
      />
      <path
        d={actualPath}
        fill="none"
        stroke={`url(#stroke-a-${gid})`}
        strokeWidth="3"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#glow-a-${gid})`}
        opacity={actualOpacity}
        className="ko-analysis-poly"
      />

      {actualPts.map((p, i) => (
        <circle
          key={`dot-${i}`}
          cx={p.x}
          cy={p.y}
          r="4.2"
          fill="var(--surface)"
          stroke="var(--brand)"
          strokeWidth="2.2"
          opacity={actualOpacity}
        />
      ))}

      {labels.map((label, i) => {
        const { angle } = axisEnd(i);
        const r = radius + 34;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        return (
          <g key={label.name} transform={`translate(${x}, ${y})`}>
            <text
              textAnchor="middle"
              y="-6"
              fill="var(--text-secondary)"
              fontSize="11"
              fontWeight="600"
              fontFamily="var(--font-outfit), system-ui, sans-serif"
            >
              {label.name}
            </text>
            <text
              textAnchor="middle"
              y="10"
              fill="var(--text-primary)"
              fontSize="12.5"
              fontWeight="800"
              fontFamily="var(--font-outfit), system-ui, sans-serif"
            >
              {label.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Sparkline({
  values,
  color,
}: {
  values: number[];
  color: string;
}) {
  const uid = useId().replace(/:/g, "");
  const width = 84;
  const height = 32;
  const line = smoothPath(values, width, height);
  const area = smoothArea(values, width, height);
  const last = sparkPoints(values, width, height).at(-1);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="ko-analysis-spark"
      aria-hidden
    >
      <defs>
        <linearGradient id={`spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${uid})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2.15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last ? (
        <circle cx={last.x} cy={last.y} r="2.6" fill="var(--surface)" stroke={color} strokeWidth="1.8" />
      ) : null}
    </svg>
  );
}

/** Panneau Analyse — liste + sparklines + radar. */
export function LearnerStatRings({
  readiness,
  probability,
  progress,
  currentPace = null,
  requiredPace = null,
}: LearnerStatRingsProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"actuel" | "objectif">("actuel");

  function unitLabel(unit: "pts" | "%" | "week"): string {
    if (unit === "week") return t("learner.unitPerWeek");
    if (unit === "pts") return t("learner.unitPts");
    return unit;
  }

  const rows = useMemo(() => {
    const paceValue =
      currentPace != null && currentPace > 0 ? currentPace : null;
    const map: Record<
      MetricKey,
      { value: number | null; target: number; empty: boolean }
    > = {
      readiness: {
        value: readiness,
        target: 100,
        empty: readiness == null,
      },
      probability: {
        value: probability,
        target: 80,
        empty: probability == null,
      },
      progress: {
        value: progress,
        target: 100,
        empty: progress == null,
      },
      pace: {
        value: paceValue,
        target: requiredPace && requiredPace > 0 ? requiredPace : 20,
        empty: paceValue == null,
      },
    };

    return METRICS.map((m) => {
      const item = map[m.key];
      const display = item.empty ? 0 : Number(item.value);
      const actualRadar =
        m.key === "pace"
          ? item.empty
            ? 0
            : Math.min(100, (display / Math.max(item.target, 1)) * 100)
          : display;
      const targetRadar =
        m.key === "pace" ? 100 : Math.min(100, item.target);
      const ratio = item.empty
        ? 0
        : Math.min(1, display / Math.max(item.target, 0.0001));
      return {
        ...m,
        ...item,
        display,
        spark: buildSpark(display || item.target * 0.35, item.empty),
        actualRadar,
        targetRadar,
        ratio,
      };
    });
  }, [readiness, probability, progress, currentPace, requiredPace]);

  const actualSeries = rows.map((r) => r.actualRadar);
  const targetSeries = rows.map((r) => r.targetRadar);
  const shortName: Record<MetricKey, string> = {
    readiness: t("learner.rings.shortPrep"),
    probability: t("learner.rings.shortProb"),
    progress: t("learner.rings.shortProg"),
    pace: t("admin.file.activityPace"),
  };
  const radarLabels = rows.map((r) => {
    const shown = mode === "objectif" ? r.target : r.display;
    const empty = mode === "actuel" && r.empty;
    const rounded = Math.round(shown * 10) / 10;
    const value = empty
      ? "—"
      : r.key === "pace"
        ? t("admin.file.perWeek", { value: rounded })
        : r.key === "readiness"
          ? t("learner.glance.pts", { n: rounded })
          : `${rounded}%`;
    return { name: shortName[r.key], value };
  });

  return (
    <section className="ko-analysis-card ko-dash-card h-full">
      <div className="ko-analysis-head">
        <div>
          <h2 className="ko-display text-[1.2rem] font-bold tracking-tight text-slate-900">
            {t("learner.rings.title")}
          </h2>
          <p className="mt-0.5 text-[0.78rem] font-medium text-slate-400">
            {t("learner.rings.subtitle")}
          </p>
        </div>
        <div className="ko-analysis-toggle" role="tablist" aria-label={t("learner.rings.series")}>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "actuel"}
            className={mode === "actuel" ? "is-active" : ""}
            onClick={() => setMode("actuel")}
          >
            {t("learner.analytics.current")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "objectif"}
            className={mode === "objectif" ? "is-active" : ""}
            onClick={() => setMode("objectif")}
          >
            {t("learner.analytics.target")}
          </button>
        </div>
      </div>

      <div className="ko-analysis-body">
        <ul className="ko-analysis-list">
          {rows.map((row, index) => {
            const shown = mode === "objectif" ? row.target : row.display;
            const empty = mode === "actuel" && row.empty;
            const reach =
              !row.empty && mode === "actuel"
                ? Math.round(row.ratio * 100)
                : null;

            return (
              <li
                key={row.key}
                className="ko-analysis-item"
                style={{ animationDelay: `${80 + index * 60}ms` }}
              >
                <span
                  className="ko-analysis-icon"
                  style={{
                    background: `linear-gradient(145deg, ${row.soft}, var(--surface))`,
                    boxShadow: `inset 0 0 0 1px ${row.color}22`,
                  }}
                >
                  <row.Icon color={row.color} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="ko-analysis-label">{t(row.labelKey)}</p>
                    {reach != null ? (
                      <span
                        className={`ko-analysis-delta ${
                          reach >= 70 ? "is-up" : "is-down"
                        }`}
                      >
                        {reach}%
                      </span>
                    ) : null}
                  </div>
                  <p className="ko-analysis-value">
                    {empty ? "—" : Math.round(shown * 10) / 10}
                    {!empty ? (
                      <span className="ko-analysis-unit">{unitLabel(row.unit)}</span>
                    ) : null}
                  </p>
                  <div className="ko-analysis-bar" aria-hidden>
                    <div
                      className="ko-analysis-bar-fill"
                      style={{
                        width: `${Math.round(
                          (mode === "objectif" ? 1 : row.ratio) * 100,
                        )}%`,
                        background: `linear-gradient(90deg, ${row.color}, ${row.color}99)`,
                      }}
                    />
                  </div>
                </div>

                <Sparkline
                  values={
                    mode === "objectif"
                      ? buildSpark(row.target, false)
                      : row.spark
                  }
                  color={row.color}
                />
              </li>
            );
          })}
        </ul>

        <div className="ko-analysis-radar-wrap">
          <div className="ko-analysis-radar-soft">
            <RadarChart
              actual={actualSeries}
              target={targetSeries}
              labels={radarLabels}
              emphasize={mode}
            />
          </div>
          <div className="ko-analysis-legend">
            <span className={mode === "actuel" ? "is-on" : ""}>
              <i className="bg-[var(--brand)]" />
              {t("learner.analytics.current")}
            </span>
            <span className={mode === "objectif" ? "is-on" : ""}>
              <i className="bg-[var(--accent)]" />
              {t("learner.analytics.target")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
