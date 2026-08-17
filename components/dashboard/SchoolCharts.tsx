"use client";

import type { ReactNode } from "react";
import type { SchoolChartPoint } from "@/lib/admin/school-overview";
import { useLanguage } from "@/components/i18n/LanguageProvider";

export { SchoolHeroChart } from "@/components/dashboard/SchoolHeroCurve";

export function SchoolMetricCard({
  title,
  value,
  hint,
  tone,
  icon,
}: {
  title: string;
  value: string;
  hint: string;
  tone: "blue" | "teal" | "amber" | "red";
  icon: ReactNode;
}) {
  return (
    <article className={`ko-inv-metric is-${tone}`}>
      <div className="ko-inv-metric-top">
        <p className="ko-inv-metric-title">{title}</p>
        <span className="ko-inv-metric-icon">{icon}</span>
      </div>
      <p className="ko-inv-metric-value">{value}</p>
      <p className="ko-inv-metric-hint">{hint}</p>
    </article>
  );
}

/** Jauge demi-cercle — répartition des risques. */
export function SchoolRiskDonut({
  segments,
}: {
  segments: Array<{ key: string; label: string; count: number; color: string }>;
}) {
  const { t } = useLanguage();
  const totalCount = segments.reduce((s, x) => s + x.count, 0);
  const total = Math.max(totalCount, 1);
  const dominant = [...segments].sort((a, b) => b.count - a.count)[0];

  const r = 68;
  const stroke = 22;
  const c = 2 * Math.PI * r;
  const half = c / 2;
  let offset = 0;

  return (
    <section className="ko-inv-card" aria-labelledby="risk-donut-title">
      <div className="ko-inv-card-head">
        <h3 id="risk-donut-title">{t("admin.school.riskDistribution")}</h3>
        <span className="ko-inv-chip">
          {t("admin.school.learnersCount", { count: totalCount })}
        </span>
      </div>

      <div className="ko-inv-donut-wrap">
        <svg viewBox="0 0 200 120" className="ko-inv-donut" aria-hidden>
          <g transform="translate(100,100)">
            <circle
              r={r}
              fill="none"
              stroke="var(--border)"
              strokeWidth={stroke}
              strokeDasharray={`${half} ${c}`}
              strokeLinecap="butt"
              transform="rotate(180)"
            />
            {segments.map((seg) => {
              const len = (seg.count / total) * half;
              const el = (
                <circle
                  key={seg.key}
                  r={r}
                  fill="none"
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${c}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                  transform="rotate(180)"
                  className="ko-inv-donut-seg"
                />
              );
              offset += len;
              return el;
            })}
          </g>
        </svg>
        <div className="ko-inv-donut-center">
          <p className="ko-inv-donut-value">{dominant?.count ?? 0}</p>
          <p className="ko-inv-donut-label">{dominant?.label ?? "—"}</p>
        </div>
      </div>

      <ul className="ko-inv-legend">
        {segments.map((seg) => (
          <li key={seg.key} className={seg.count === 0 ? "is-muted" : undefined}>
            <span style={{ background: seg.color }} />
            <em>{seg.label}</em>
            <strong>
              {seg.count}
              <span className="ko-inv-legend-pct">
                {Math.round((seg.count / total) * 100)} %
              </span>
            </strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Barres groupées — paliers de progression. */
export function SchoolProgressBars({
  points,
}: {
  points: SchoolChartPoint[];
}) {
  const { t } = useLanguage();
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <section className="ko-inv-card" aria-labelledby="progress-bars-title">
      <div className="ko-inv-card-head">
        <h3 id="progress-bars-title">{t("admin.file.progress")}</h3>
        <span className="ko-inv-chip">{t("admin.school.progressTiers")}</span>
      </div>
      <div className="ko-inv-bars">
        {points.map((p) => {
          const h = p.value <= 0 ? 0 : Math.max(12, (p.value / max) * 100);
          return (
            <div key={p.label} className="ko-inv-bar-col">
              <p className="ko-inv-bar-value">{p.value}</p>
              <div className="ko-inv-bar-track">
                {p.value > 0 ? (
                  <span
                    className="ko-inv-bar-fill"
                    style={{ height: `${h}%` }}
                    title={t("admin.school.learnerBar", { count: p.value })}
                  />
                ) : (
                  <span className="ko-inv-bar-empty" aria-hidden />
                )}
              </div>
              <p className="ko-inv-bar-label">{p.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
