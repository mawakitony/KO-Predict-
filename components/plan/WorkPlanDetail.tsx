"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  PlanCycleCurve,
  type PlanCurvePoint,
} from "@/components/plan/PlanCycleCurve";
import {
  Icon3dActivity,
  Icon3dCalendar,
  Icon3dCheck,
  Icon3dClock,
  Icon3dSpark,
  Icon3dTarget,
} from "@/components/plan/Plan3dIcons";
import { SegmentedProgressBar } from "@/components/plan/SegmentedProgressBar";
import { formatDateShort } from "@/lib/i18n/format-date";
import {
  planStatusKey,
  planTaskStatusKey,
  planTaskTitleKey,
  planTypeKey,
} from "@/lib/i18n/labels";
import type { Locale } from "@/lib/i18n/storage";
import type { TranslateParams, MessageKey } from "@/lib/i18n/translate";
import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";
import { countMeasurableTasks } from "@/lib/planning/work-plan/progress";
import {
  buildWorkPlanPaceView,
  buildWorkPlanSummaryView,
  findActivitiesTask,
  formatActivitiesProgress,
  workPlanTaskProgressView,
} from "@/lib/planning/work-plan/presentation";
import type { WorkPlanTask } from "@/lib/planning/work-plan/types";

const DONUT_COLORS = [
  "#14b8a6",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

function formatPlanPeriod(
  startsAt: string,
  endsAt: string,
  locale: Locale,
  unavailable: string,
): string {
  const start = formatDateShort(startsAt.slice(0, 10), locale);
  const end = formatDateShort(endsAt.slice(0, 10), locale);
  if (start === "—" || end === "—") return unavailable;
  return `${start} → ${end}`;
}

function taskProgressLabel(
  task: WorkPlanTask,
  t: (key: MessageKey, params?: TranslateParams) => string,
): string {
  const progress = workPlanTaskProgressView(task);
  if (task.type === "QCM_PRACTICE" || task.type === "MAINTAIN_PACE") {
    return t("learner.planUi.qualitative");
  }
  if (!task.measurable) return t("admin.plan.orientation");
  return progress.label.replace(/\s*%$/, "%");
}

function daysLeft(endsAt: string): number | null {
  const end = Date.parse(endsAt);
  if (!Number.isFinite(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

function cycleDayIndex(startsAt: string, endsAt: string): {
  day: number;
  total: number;
  elapsedPct: number;
} {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { day: 1, total: 7, elapsedPct: 0 };
  }
  const totalMs = end - start;
  const elapsedMs = Math.min(Math.max(Date.now() - start, 0), totalMs);
  const total = Math.max(1, Math.round(totalMs / 86_400_000));
  const day = Math.min(
    total,
    Math.max(1, Math.floor(elapsedMs / 86_400_000) + 1),
  );
  return {
    day,
    total,
    elapsedPct: Math.round((elapsedMs / totalMs) * 100),
  };
}

function measurablePctOf(plan: PersistedWorkPlan): number {
  const { completed, total } = countMeasurableTasks(plan.tasks);
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}

function MiniDonut({
  value,
  color,
  qualitative,
}: {
  value: number | null;
  color: string;
  qualitative?: boolean;
}) {
  if (qualitative || value == null) {
    return (
      <div className="ko-plan-donut is-qualitative" aria-hidden>
        <span className="ko-plan-donut-hole is-qualitative">
          <span className="ko-plan-donut-qual-mark">·</span>
        </span>
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className="ko-plan-donut"
      style={{
        background: `conic-gradient(${color} 0 ${pct}%, #e8eef3 ${pct}% 100%)`,
      }}
      aria-hidden
    >
      <span className="ko-plan-donut-hole" />
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  footer,
  footerTone = "neutral",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  footer: string;
  footerTone?: "up" | "down" | "neutral";
}) {
  return (
    <article className="ko-plan-kpi">
      <div className="ko-plan-kpi-top">
        <p className="ko-plan-kpi-label">{label}</p>
        <p className="ko-plan-kpi-value">{value}</p>
      </div>
      <div className="ko-plan-kpi-bottom">
        <span className="ko-plan-kpi-icon is-3d">{icon}</span>
        <p className={`ko-plan-kpi-trend is-${footerTone}`}>{footer}</p>
      </div>
    </article>
  );
}

/**
 * Visualisation V1 : reconstruction depuis l'état actuel (et plans précédents
 * s'ils existent). Aucun point journalier J1→J7 n'est persisté.
 */
function buildCurveSeries(
  active: PersistedWorkPlan,
  previous: PersistedWorkPlan[],
  measurablePct: number,
  locale: Locale,
  t: (key: MessageKey, params?: TranslateParams) => string,
): { series: PlanCurvePoint[]; pace: number[]; note: string } {
  const history = [...previous]
    .slice(0, 5)
    .reverse()
    .map((plan) => ({
      label: formatDateShort(plan.startsAt.slice(0, 10), locale),
      value: measurablePctOf(plan),
      sub: `${t(planTypeKey(plan.planType))} · ${
        plan.status === "COMPLETED"
          ? t("plan.status.completed")
          : t("learner.plan.closed")
      }`,
      isCurrent: false,
    }));

  const honestNote = t("learner.plan.curveNote");

  if (history.length >= 1) {
    return {
      series: [
        ...history,
        {
          label: t("learner.plan.current"),
          value: measurablePct,
          sub: t(planTypeKey(active.planType)),
          isCurrent: true,
        },
      ],
      pace: [],
      note: `${honestNote} ${t("learner.plan.curveNoteHistory")}`,
    };
  }

  const cycle = cycleDayIndex(active.startsAt, active.endsAt);
  const startLabel = formatDateShort(active.startsAt.slice(0, 10), locale);
  const midLabel = t("learner.dayIndex", { n: cycle.day });

  return {
    series: [
      {
        label: startLabel,
        value: 0,
        sub: t("learner.plan.cycleStart"),
      },
      {
        label: midLabel,
        value: measurablePct,
        sub: t("learner.plan.dayOf", { day: cycle.day, total: cycle.total }),
        isCurrent: true,
      },
    ],
    pace: [0, cycle.elapsedPct],
    note: `${honestNote} ${t("learner.plan.curveNotePace")}`,
  };
}

export function WorkPlanDetail({
  active,
  previous,
}: {
  active: PersistedWorkPlan | null;
  previous: PersistedWorkPlan[];
}) {
  const { t, locale } = useLanguage();

  if (!active) {
    return (
      <div className="ko-plan-board ko-dash-stagger">
        <section className="ko-plan-empty">
          <Icon3dTarget
            className="ko-plan-3d mx-auto"
            style={{ width: "3.5rem", height: "3.5rem" }}
          />
          <h2 className="ko-display mt-4 text-xl font-semibold text-slate-900">
            {t("learner.plan.none")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            {t("learner.planEmptySync")}
          </p>
          <Link href="/dashboard" className="ko-plan-primary-btn">
            {t("learner.plan.backDashboard")}
          </Link>
        </section>
      </div>
    );
  }

  const summary = buildWorkPlanSummaryView(active);
  const paceView = buildWorkPlanPaceView(active);
  const activitiesTask = findActivitiesTask(active.tasks);
  const remaining = daysLeft(active.endsAt);
  const measurablePct = measurablePctOf(active);
  const cycle = cycleDayIndex(active.startsAt, active.endsAt);
  const { series, pace, note } = buildCurveSeries(
    active,
    previous,
    measurablePct,
    locale,
    t,
  );
  const completedCount = active.tasks.filter((task) => task.status === "COMPLETED")
    .length;
  const inProgressCount = active.tasks.filter(
    (task) => task.status === "IN_PROGRESS",
  ).length;
  const period = formatPlanPeriod(
    active.startsAt,
    active.endsAt,
    locale,
    t("learner.plan.periodUnavailable"),
  );
  const reevalDate = formatDateShort(active.endsAt.slice(0, 10), locale);
  const measurableProgress = t("learner.planUi.measurableProgress", {
    completed: summary.measurableCompleted,
    total: summary.measurableTotal,
  });

  return (
    <div className="ko-plan-board ko-dash-stagger">
      <section className="ko-plan-hero">
        <div className="ko-plan-hero-main">
          <p className="ko-plan-hero-kicker">
            <Icon3dSpark className="ko-plan-3d is-sm" />
            {t("learner.planTitle")}
          </p>
          <h2 className="ko-plan-hero-title">{summary.primaryObjective}</h2>
          <p className="ko-plan-hero-reason">{summary.reason}</p>
          <div className="ko-plan-hero-meta">
            <span className="ko-plan-chip is-teal">
              {t(planTypeKey(active.planType))}
            </span>
            <span className="ko-plan-chip">{t(planStatusKey(active.status))}</span>
            <span className="ko-plan-chip is-muted">
              <Icon3dCalendar className="ko-plan-3d is-xs" />
              {period}
            </span>
          </div>
        </div>
        <div
          className="ko-plan-hero-ring"
          aria-label={t("learner.planUi.ringAria", { pct: measurablePct })}
        >
          <div
            className="ko-plan-hero-ring-viz"
            style={{
              background: `conic-gradient(#0d9488 0 ${measurablePct}%, #e2e8f0 ${measurablePct}% 100%)`,
            }}
          >
            <div className="ko-plan-hero-ring-hole">
              <p className="ko-plan-hero-ring-value">{measurablePct}%</p>
              <p className="ko-plan-hero-ring-label">
                {t("learner.planUi.measurableShort")}
              </p>
            </div>
          </div>
          <p className="ko-plan-hero-ring-caption">
            {t("learner.planUi.dayReeval", {
              day: cycle.day,
              total: cycle.total,
              date: reevalDate,
            })}
          </p>
        </div>
      </section>

      <div className="ko-plan-kpi-row">
        <KpiCard
          label={t("learner.planUi.planProgress")}
          value={`${measurablePct}%`}
          icon={<Icon3dCheck />}
          footer={measurableProgress}
          footerTone={measurablePct > 0 ? "up" : "neutral"}
        />
        <KpiCard
          label={t("admin.plan.activities")}
          value={summary.activitiesLabel ?? "—"}
          icon={<Icon3dActivity />}
          footer={
            activitiesTask?.target != null
              ? t("learner.planUi.objectiveN", { n: activitiesTask.target })
              : t("learner.planUi.noNumericTarget")
          }
        />
        <KpiCard
          label={t("learner.planUi.daysLeft")}
          value={
            remaining == null ? "—" : remaining === 0 ? "0" : String(remaining)
          }
          icon={<Icon3dClock />}
          footer={t("learner.planUi.reevalShort", { date: reevalDate })}
          footerTone={remaining != null && remaining <= 2 ? "down" : "neutral"}
        />
        <KpiCard
          label={t("learner.planUi.pace")}
          value={t(paceView.valueKey)}
          icon={<Icon3dTarget />}
          footer={t(paceView.detailKey)}
          footerTone={paceView.tone}
        />
      </div>

      <div className="ko-plan-analytics">
        <div className="ko-plan-analytics-body is-curve">
          <PlanCycleCurve
            headline={t("learner.planUi.curveHeadline")}
            headlineValue={`${measurablePct}%`}
            deltaLabel={t(paceView.detailKey)}
            series={series}
            paceSeries={pace.length ? pace : undefined}
            note={note}
          />

          <aside className="ko-plan-breakdown">
            <h3 className="ko-plan-breakdown-title">
              {t("learner.planUi.breakdown")}
            </h3>
            <p className="ko-plan-breakdown-hint">
              {t("learner.planUi.breakdownHint", {
                tasks: summary.taskCount,
                measurable: summary.measurableTotal,
              })}
            </p>
            <ol className="ko-plan-breakdown-list">
              {active.tasks.map((task, index) => {
                const progress = workPlanTaskProgressView(task);
                return (
                  <li key={task.id} className="ko-plan-breakdown-item is-seg">
                    <span className="ko-plan-breakdown-rank">{index + 1}</span>
                    <div className="ko-plan-breakdown-copy">
                      <span className="ko-plan-breakdown-name">
                        {t(planTaskTitleKey(task.type))}
                      </span>
                      <SegmentedProgressBar
                        percent={
                          progress.showGauge ? progress.percent : null
                        }
                        label={taskProgressLabel(task, t)}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="ko-plan-breakdown-stats">
              <div>
                <p>{completedCount}</p>
                <span>{t("learner.planUi.done")}</span>
              </div>
              <div>
                <p>{inProgressCount}</p>
                <span>{t("learner.planUi.inProgress")}</span>
              </div>
              <div>
                <p>{active.tasks.length - completedCount - inProgressCount}</p>
                <span>{t("learner.planUi.todo")}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="ko-plan-donut-row">
        {active.tasks.slice(0, 5).map((task, index) => {
          const progress = workPlanTaskProgressView(task);
          const color = DONUT_COLORS[index % DONUT_COLORS.length];
          return (
            <article key={task.id} className="ko-plan-donut-card">
              <div className="min-w-0">
                <p className="ko-plan-donut-label">
                  {t(planTaskTitleKey(task.type))}
                </p>
                <p className="ko-plan-donut-value">
                  {progress.showGauge && progress.percent != null
                    ? `${progress.percent}%`
                    : taskProgressLabel(task, t)}
                </p>
                <p className="ko-plan-donut-status">
                  {t(planTaskStatusKey(task.status))}
                </p>
              </div>
              <MiniDonut
                value={progress.percent}
                color={color}
                qualitative={!progress.showGauge}
              />
            </article>
          );
        })}
      </div>

      <section className="ko-plan-table-card">
        <div className="ko-plan-table-head">
          <div>
            <h3>{t("learner.planUi.detail")}</h3>
            <p className="ko-plan-table-sub">
              {t("learner.planUi.detailSub", {
                count: summary.taskCount,
                progress: measurableProgress,
              })}
            </p>
          </div>
          <p>{t("learner.planUi.items", { n: active.tasks.length })}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="ko-plan-table">
            <thead>
              <tr>
                <th>{t("learner.planUi.colTask")}</th>
                <th>{t("learner.planUi.colStatus")}</th>
                <th>{t("learner.planUi.colProgress")}</th>
                <th>{t("learner.planUi.colReason")}</th>
              </tr>
            </thead>
            <tbody>
              {active.tasks.map((task) => {
                const progress = workPlanTaskProgressView(task);
                const activitiesLabel =
                  task.type === "ACTIVITIES"
                    ? formatActivitiesProgress(task)
                    : null;
                return (
                  <tr key={task.id}>
                    <td>
                      <p className="font-semibold text-slate-900">
                        {t(planTaskTitleKey(task.type))}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {task.description}
                      </p>
                    </td>
                    <td>
                      <span
                        className={`ko-plan-status-pill is-${task.status.toLowerCase()}`}
                      >
                        {t(planTaskStatusKey(task.status))}
                      </span>
                    </td>
                    <td>
                      <div className="ko-plan-table-progress">
                        {activitiesLabel ? (
                          <span className="ko-plan-table-progress-meta">
                            {activitiesLabel}
                          </span>
                        ) : null}
                        <SegmentedProgressBar
                          percent={
                            progress.showGauge ? progress.percent : null
                          }
                          label={taskProgressLabel(task, t)}
                        />
                      </div>
                    </td>
                    <td className="text-slate-500">{task.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {previous.length > 0 ? (
        <section className="ko-plan-table-card">
          <div className="ko-plan-table-head">
            <h3>{t("learner.planUi.history")}</h3>
            <p>{t("learner.planUi.plansN", { n: previous.length })}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="ko-plan-table">
              <thead>
                <tr>
                  <th>{t("learner.planUi.colPlan")}</th>
                  <th>{t("learner.planUi.colPeriod")}</th>
                  <th>{t("learner.planUi.colStatus")}</th>
                  <th>{t("admin.plan.activities")}</th>
                </tr>
              </thead>
              <tbody>
                {previous.map((plan) => (
                  <tr key={plan.id}>
                    <td className="font-semibold text-slate-900">
                      {t(planTypeKey(plan.planType))}
                    </td>
                    <td>
                      {formatPlanPeriod(
                        plan.startsAt,
                        plan.endsAt,
                        locale,
                        t("learner.plan.periodUnavailable"),
                      )}
                    </td>
                    <td>{t(planStatusKey(plan.status))}</td>
                    <td>
                      {formatActivitiesProgress(
                        findActivitiesTask(plan.tasks),
                      ) ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
