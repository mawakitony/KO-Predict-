"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/translate";

type AnalyticsTab = "readiness" | "progress" | "probability" | "pace";

interface LearnerAnalyticsPanelProps {
  readiness: number | null;
  progress: number | null;
  probability: number | null;
  currentPace: number | null;
  requiredPace: number | null;
  studyTimeMinutes: number;
  completedActivities: number;
  totalActivities: number;
  qcmAverage: number | null;
  inactiveDays: number;
  certification: string;
}

const TABS: Array<{ id: AnalyticsTab; key: MessageKey }> = [
  { id: "readiness", key: "admin.file.preparation" },
  { id: "progress", key: "admin.file.progress" },
  { id: "probability", key: "admin.file.probability" },
  { id: "pace", key: "admin.file.activityPace" },
];

function buildSeries(endValue: number, points = 7): number[] {
  const start = Math.max(0, endValue * 0.35);
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const eased = 1 - (1 - t) ** 2.2;
    const wobble = Math.sin(t * Math.PI * 1.5) * endValue * 0.05;
    return Math.max(0, start + (endValue - start) * eased + wobble);
  });
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 1.5" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z" />
      <path d="M4 5.5V21.5" />
    </svg>
  );
}

function IconQuiz() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 11h6M9 15h3" />
    </svg>
  );
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M10 9v6M14 9v6" />
    </svg>
  );
}

function BarChart({
  primary,
  secondary,
  labels,
  ghost = false,
}: {
  primary: number[];
  secondary: number[];
  labels: string[];
  ghost?: boolean;
}) {
  const { t } = useLanguage();
  const max = Math.max(...primary, ...secondary, 1) * 1.15;
  const plotHeight = 200;
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div className={`relative mt-1 ${ghost ? "ko-habits-ghost" : ""}`}>
      <div
        className="flex h-[230px] items-stretch gap-2 sm:gap-3"
        role="img"
        aria-label={
          ghost ? t("learner.analytics.previewAria") : t("learner.analytics.chartAria")
        }
      >
        {primary.map((p, i) => {
          const s = secondary[i] ?? 0;
          const h1 = Math.max(6, Math.round((p / max) * plotHeight));
          const h2 = Math.max(6, Math.round((s / max) * plotHeight));
          const active = !ghost && hover === i;
          return (
            <button
              key={`${labels[i]}-${i}`}
              type="button"
              disabled={ghost}
              className="group relative flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5 disabled:cursor-default"
              onMouseEnter={() => !ghost && setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => !ghost && setHover(i)}
              onBlur={() => setHover(null)}
            >
              {active ? (
                <span className="ko-dd-tooltip pointer-events-none absolute bottom-[calc(100%-0.5rem)] z-10 whitespace-nowrap">
                  {t("learner.analytics.tooltip", {
                    current: Math.round(p),
                    target: Math.round(s),
                  })}
                </span>
              ) : null}
              <div className="flex h-[200px] w-full max-w-[2.6rem] items-end justify-center gap-1 sm:max-w-[3.1rem]">
                <span
                  className={`ko-dd-bar ${ghost ? "ko-dd-bar-ghost" : "ko-dd-bar-primary"}`}
                  style={{
                    height: `${h1}px`,
                    animationDelay: `${i * 60}ms`,
                  }}
                />
                <span
                  className={`ko-dd-bar ${ghost ? "ko-dd-bar-ghost-soft" : "ko-dd-bar-secondary"}`}
                  style={{
                    height: `${h2}px`,
                    animationDelay: `${80 + i * 60}ms`,
                  }}
                />
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {labels[i]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Panneau histogramme DealDeck — rempli ou aperçu pendant la collecte. */
export function LearnerAnalyticsPanel(props: LearnerAnalyticsPanelProps) {
  const { t } = useLanguage();
  const {
    readiness,
    progress,
    probability,
    currentPace,
    requiredPace,
    studyTimeMinutes,
    completedActivities,
    totalActivities,
    qcmAverage,
    inactiveDays,
    certification,
  } = props;

  const [tab, setTab] = useState<AnalyticsTab>("readiness");

  const chart = useMemo(() => {
    const map: Record<
      AnalyticsTab,
      { end: number; target: number; empty: boolean; title: string; unit: string }
    > = {
      readiness: {
        end: readiness ?? 0,
        target: 100,
        empty: readiness == null,
        title: t("learner.analytics.readinessTrend"),
        unit: "pts",
      },
      progress: {
        end: progress ?? 0,
        target: 100,
        empty: progress == null,
        title: t("learner.analytics.progressTrend"),
        unit: "%",
      },
      probability: {
        end: probability ?? 0,
        target: 80,
        empty: probability == null,
        title: t("learner.analytics.probabilityTrend"),
        unit: "%",
      },
      pace: {
        end: currentPace != null && currentPace > 0 ? currentPace : 0,
        target: requiredPace ?? Math.max(currentPace ?? 1, 1),
        empty: currentPace == null || currentPace <= 0,
        title: t("learner.analytics.paceTrend"),
        unit: t("learner.unitPerWeek"),
      },
    };
    const active = map[tab];
    const primary = active.empty
      ? [18, 28, 22, 40, 34, 52, 46]
      : buildSeries(active.end);
    const secondary = active.empty
      ? [30, 36, 42, 48, 55, 62, 70]
      : buildSeries(active.target * 0.85).map((v, i) =>
          Math.min(
            active.target,
            v + (i === primary.length - 1 ? active.target * 0.08 : 0),
          ),
        );
    return { ...active, primary, secondary };
  }, [tab, readiness, progress, probability, currentPace, requiredPace, t]);

  const labels = [18, 15, 12, 9, 6, 3]
    .map((n) => t("learner.dayMinus", { n }))
    .concat(t("learner.analytics.now"));

  const sideStats: Array<{
    label: string;
    value: string;
    hint: string;
    icon: ReactNode;
    tone: string;
  }> = [
    {
      label: t("admin.file.studyTime"),
      value: t("admin.file.studyTimeMin", { minutes: studyTimeMinutes }),
      hint: t("learner.analytics.totalRecorded"),
      icon: <IconClock />,
      tone: "#2563eb",
    },
    {
      label: t("admin.file.activities"),
      value: `${completedActivities}/${totalActivities}`,
      hint: t("learner.analytics.completedOf"),
      icon: <IconBook />,
      tone: "#0d9488",
    },
    {
      label: t("admin.file.qcmAverage"),
      value: qcmAverage != null ? `${Math.round(qcmAverage)}%` : "—",
      hint: qcmAverage == null ? t("learner.analytics.noQcm") : t("learner.analytics.avgScore"),
      icon: <IconQuiz />,
      tone: "#0ea5e9",
    },
    {
      label: t("learner.analytics.inactivity"),
      value: t("admin.file.inactivityDays", { days: inactiveDays }),
      hint: t("learner.analytics.noRecent"),
      icon: <IconPause />,
      tone: "#64748b",
    },
  ];

  return (
    <section className="ko-habits-card ko-dash-card">
      <div className="ko-habits-head">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="ko-display text-lg font-bold text-slate-900">
              {t("learner.analytics.title")}
            </h2>
            <span className={`ko-habits-badge ${chart.empty ? "is-wait" : "is-live"}`}>
              <span className="ko-analytics-pulse" />
              {chart.empty
                ? t("learner.analytics.collecting")
                : t("learner.analytics.live")}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {certification} · {chart.title}
          </p>
        </div>
        <div className="ko-habits-legend">
          <span>
            <i className="bg-[#2563eb]" />
            {t("learner.analytics.current")}
          </span>
          <span>
            <i className="bg-[#93c5fd]" />
            {t("learner.analytics.target")}
          </span>
        </div>
      </div>

      <div className="ko-habits-tabs" role="tablist" aria-label={t("learner.analytics.indicator")}>
        {TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={`ko-habits-tab ${active ? "is-active" : ""}`}
            >
              {t(item.key)}
            </button>
          );
        })}
      </div>

      <div className="ko-habits-chart-wrap">
        {chart.empty ? (
          <>
            <div className="ko-habits-empty-banner">
              <div>
                <p className="ko-display text-base font-bold text-slate-900">
                  {t("learner.analytics.chartSoon")}
                </p>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  {t("learner.analytics.chartSoonBody")}
                </p>
              </div>
              <span className="ko-habits-empty-pill">
                {t("learner.analytics.comingSoon")}
              </span>
            </div>
            <BarChart
              key={`ghost-${tab}`}
              primary={chart.primary}
              secondary={chart.secondary}
              labels={labels}
              ghost
            />
          </>
        ) : (
          <>
            <div className="mt-1 flex items-end gap-3">
              <p className="ko-display text-4xl font-extrabold tracking-tight text-slate-900">
                {Math.round(chart.end)}
                <span className="ml-1 text-lg font-bold text-slate-500">
                  {chart.unit}
                </span>
              </p>
              <p className="mb-1 text-sm font-semibold text-slate-500">
                {t("learner.analytics.currentValue")}
              </p>
            </div>
            <BarChart
              key={tab}
              primary={chart.primary}
              secondary={chart.secondary}
              labels={labels}
            />
          </>
        )}
      </div>

      <div className="ko-habits-stats">
        {sideStats.map((stat) => (
          <article
            key={stat.label}
            className="ko-habits-stat"
            style={{ ["--stat-tone" as string]: stat.tone }}
          >
            <span className="ko-habits-stat-icon">{stat.icon}</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-500">{stat.label}</p>
              <p className="ko-display mt-0.5 text-xl font-extrabold text-slate-900">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {stat.hint}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
