import Link from "next/link";
import type { ReactNode } from "react";
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
import { formatDateShortFr } from "@/lib/dashboard/format";
import { LEARNER_COPY } from "@/lib/learner/copy";
import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";
import { countMeasurableTasks } from "@/lib/planning/work-plan/progress";
import { workPlanTypeLabelFr } from "@/lib/planning/work-plan/map-type";
import {
  buildPreviousPlanRow,
  buildWorkPlanPaceView,
  buildWorkPlanSummaryView,
  findActivitiesTask,
  formatActivitiesProgress,
  workPlanTaskProgressView,
  workPlanTaskStatusLabelFr,
} from "@/lib/planning/work-plan/presentation";

const DONUT_COLORS = [
  "#14b8a6",
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

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
): { series: PlanCurvePoint[]; pace: number[]; note: string } {
  const history = [...previous]
    .slice(0, 5)
    .reverse()
    .map((plan) => ({
      label: formatDateShortFr(plan.startsAt.slice(0, 10)),
      value: measurablePctOf(plan),
      sub: `${workPlanTypeLabelFr(plan.planType)} · ${plan.status === "COMPLETED" ? "Atteint" : "Clos"}`,
      isCurrent: false,
    }));

  const honestNote =
    "État reconstruit à partir des données actuelles — aucun historique journalier n'est persisté sur les 7 jours.";

  if (history.length >= 1) {
    return {
      series: [
        ...history,
        {
          label: "Actuel",
          value: measurablePct,
          sub: workPlanTypeLabelFr(active.planType),
          isCurrent: true,
        },
      ],
      pace: [],
      note: `${honestNote} Points = plans successifs (clôture / actuel), pas une série J1–J7.`,
    };
  }

  const cycle = cycleDayIndex(active.startsAt, active.endsAt);
  const startLabel = formatDateShortFr(active.startsAt.slice(0, 10));
  const midLabel = `J${cycle.day}`;

  return {
    series: [
      {
        label: startLabel,
        value: 0,
        sub: "Début du cycle",
      },
      {
        label: midLabel,
        value: measurablePct,
        sub: `Jour ${cycle.day}/${cycle.total} · état actuel`,
        isCurrent: true,
      },
    ],
    pace: [0, cycle.elapsedPct],
    note: `${honestNote} Pointillés = rythme cible linéaire théorique.`,
  };
}

export function WorkPlanDetail({
  active,
  previous,
}: {
  active: PersistedWorkPlan | null;
  previous: PersistedWorkPlan[];
}) {
  if (!active) {
    return (
      <div className="ko-plan-board ko-dash-stagger">
        <section className="ko-plan-empty">
          <Icon3dTarget
            className="ko-plan-3d mx-auto"
            style={{ width: "3.5rem", height: "3.5rem" }}
          />
          <h2 className="ko-display mt-4 text-xl font-semibold text-slate-900">
            Aucun plan actif
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            {LEARNER_COPY.planEmptySync}
          </p>
          <Link href="/dashboard" className="ko-plan-primary-btn">
            Retour au tableau de bord
          </Link>
        </section>
      </div>
    );
  }

  const summary = buildWorkPlanSummaryView(active);
  const paceView = buildWorkPlanPaceView(active);
  const previousRows = previous.map(buildPreviousPlanRow);
  const activitiesTask = findActivitiesTask(active.tasks);
  const remaining = daysLeft(active.endsAt);
  const measurablePct = measurablePctOf(active);
  const cycle = cycleDayIndex(active.startsAt, active.endsAt);
  const { series, pace, note } = buildCurveSeries(
    active,
    previous,
    measurablePct,
  );
  const completedCount = active.tasks.filter((t) => t.status === "COMPLETED")
    .length;
  const inProgressCount = active.tasks.filter(
    (t) => t.status === "IN_PROGRESS",
  ).length;

  return (
    <div className="ko-plan-board ko-dash-stagger">
      <section className="ko-plan-hero">
        <div className="ko-plan-hero-main">
          <p className="ko-plan-hero-kicker">
            <Icon3dSpark className="ko-plan-3d is-sm" />
            Mon plan de progression
          </p>
          <h2 className="ko-plan-hero-title">{summary.primaryObjective}</h2>
          <p className="ko-plan-hero-reason">{summary.reason}</p>
          <div className="ko-plan-hero-meta">
            <span className="ko-plan-chip is-teal">{summary.typeLabel}</span>
            <span className="ko-plan-chip">{summary.statusLabel}</span>
            <span className="ko-plan-chip is-muted">
              <Icon3dCalendar className="ko-plan-3d is-xs" />
              {summary.periodLabel}
            </span>
          </div>
        </div>
        <div
          className="ko-plan-hero-ring"
          aria-label={`Progression ${measurablePct}%`}
        >
          <div
            className="ko-plan-hero-ring-viz"
            style={{
              background: `conic-gradient(#0d9488 0 ${measurablePct}%, #e2e8f0 ${measurablePct}% 100%)`,
            }}
          >
            <div className="ko-plan-hero-ring-hole">
              <p className="ko-plan-hero-ring-value">{measurablePct}%</p>
              <p className="ko-plan-hero-ring-label">mesurable</p>
            </div>
          </div>
          <p className="ko-plan-hero-ring-caption">
            Jour {cycle.day}/{cycle.total} · réévaluation{" "}
            {summary.reevaluationLabel}
          </p>
        </div>
      </section>

      <div className="ko-plan-kpi-row">
        <KpiCard
          label="Progression plan"
          value={`${measurablePct}%`}
          icon={<Icon3dCheck />}
          footer={summary.measurableProgressLabel}
          footerTone={measurablePct > 0 ? "up" : "neutral"}
        />
        <KpiCard
          label="Activités"
          value={summary.activitiesLabel ?? "—"}
          icon={<Icon3dActivity />}
          footer={
            activitiesTask?.target != null
              ? `Objectif ${activitiesTask.target}`
              : "Sans cible chiffrée"
          }
        />
        <KpiCard
          label="Jours restants"
          value={
            remaining == null ? "—" : remaining === 0 ? "0" : String(remaining)
          }
          icon={<Icon3dClock />}
          footer={`Réévaluation ${summary.reevaluationLabel}`}
          footerTone={remaining != null && remaining <= 2 ? "down" : "neutral"}
        />
        <KpiCard
          label="Rythme"
          value={paceView.valueLabel}
          icon={<Icon3dTarget />}
          footer={paceView.detailLabel}
          footerTone={paceView.tone}
        />
      </div>

      <div className="ko-plan-analytics">
        <div className="ko-plan-analytics-body is-curve">
          <PlanCycleCurve
            headline="État d'avancement du cycle"
            headlineValue={`${measurablePct}%`}
            deltaLabel={paceView.detailLabel}
            series={series}
            paceSeries={pace.length ? pace : undefined}
            note={note}
          />

          <aside className="ko-plan-breakdown">
            <h3 className="ko-plan-breakdown-title">Répartition des tâches</h3>
            <p className="ko-plan-breakdown-hint">
              {summary.taskCount} tâches · {summary.measurableTotal} objectifs
              mesurables
            </p>
            <ol className="ko-plan-breakdown-list">
              {active.tasks.map((task, index) => {
                const progress = workPlanTaskProgressView(task);
                return (
                  <li key={task.id} className="ko-plan-breakdown-item is-seg">
                    <span className="ko-plan-breakdown-rank">{index + 1}</span>
                    <div className="ko-plan-breakdown-copy">
                      <span className="ko-plan-breakdown-name">{task.title}</span>
                      <SegmentedProgressBar
                        percent={
                          progress.showGauge ? progress.percent : null
                        }
                        label={progress.label.replace(/\s*%$/, "%")}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="ko-plan-breakdown-stats">
              <div>
                <p>{completedCount}</p>
                <span>Terminées</span>
              </div>
              <div>
                <p>{inProgressCount}</p>
                <span>En cours</span>
              </div>
              <div>
                <p>{active.tasks.length - completedCount - inProgressCount}</p>
                <span>À faire</span>
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
                <p className="ko-plan-donut-label">{task.title}</p>
                <p className="ko-plan-donut-value">
                  {progress.showGauge && progress.percent != null
                    ? `${progress.percent}%`
                    : progress.label}
                </p>
                <p className="ko-plan-donut-status">
                  {workPlanTaskStatusLabelFr(task.status)}
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
            <h3>Détail des tâches</h3>
            <p className="ko-plan-table-sub">
              {summary.taskCount} tâches · {summary.measurableProgressLabel}
            </p>
          </div>
          <p>{active.tasks.length} éléments</p>
        </div>
        <div className="overflow-x-auto">
          <table className="ko-plan-table">
            <thead>
              <tr>
                <th>Tâche</th>
                <th>Statut</th>
                <th>Progression</th>
                <th>Motif</th>
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
                        {task.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {task.description}
                      </p>
                    </td>
                    <td>
                      <span
                        className={`ko-plan-status-pill is-${task.status.toLowerCase()}`}
                      >
                        {workPlanTaskStatusLabelFr(task.status)}
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
                          label={progress.label.replace(/\s*%$/, "%")}
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

      {previousRows.length > 0 ? (
        <section className="ko-plan-table-card">
          <div className="ko-plan-table-head">
            <h3>Historique</h3>
            <p>{previousRows.length} plan(s)</p>
          </div>
          <div className="overflow-x-auto">
            <table className="ko-plan-table">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Période</th>
                  <th>Statut</th>
                  <th>Activités</th>
                </tr>
              </thead>
              <tbody>
                {previousRows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-semibold text-slate-900">
                      {row.typeLabel}
                    </td>
                    <td>{row.periodLabel}</td>
                    <td>{row.statusLabel}</td>
                    <td>{row.activitiesLabel ?? "—"}</td>
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
