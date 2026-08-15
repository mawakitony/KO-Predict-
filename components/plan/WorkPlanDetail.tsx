import Link from "next/link";
import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";
import {
  buildPreviousPlanRow,
  buildWorkPlanSummaryView,
  formatActivitiesProgress,
  workPlanTaskStatusLabelFr,
} from "@/lib/planning/work-plan/presentation";

function TaskCard({
  title,
  description,
  statusLabel,
  progressLabel,
  reason,
  measurable,
}: {
  title: string;
  description: string;
  statusLabel: string;
  progressLabel: string | null;
  reason: string;
  measurable: boolean;
}) {
  return (
    <li className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {statusLabel}
        </span>
      </div>
      {progressLabel ? (
        <p className="mt-3 text-base font-semibold text-slate-900">
          {progressLabel}
        </p>
      ) : !measurable ? (
        <p className="mt-3 text-xs font-medium text-slate-500">
          Orientation — pas d’objectif chiffré
        </p>
      ) : null}
      <p className="mt-2 text-xs text-slate-500">{reason}</p>
    </li>
  );
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
      <div className="space-y-4">
        <section className="ko-dash-card p-5 sm:p-6">
          <h2 className="ko-display text-xl font-semibold text-slate-900">
            Aucun plan actif
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Votre premier plan sera généré automatiquement après la prochaine
            synchronisation.
          </p>
          <p className="mt-4 text-xs text-slate-500">
            KO Predict™ adapte ce plan à partir de votre progression, de vos
            résultats et de votre rythme de préparation.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex text-sm font-semibold text-blue-700 hover:underline"
          >
            Retour au tableau de bord
          </Link>
        </section>
      </div>
    );
  }

  const summary = buildWorkPlanSummaryView(active);
  const previousRows = previous.map(buildPreviousPlanRow);

  return (
    <div className="space-y-4">
      <section className="ko-dash-card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Mon plan
            </p>
            <h2 className="ko-display mt-1 text-2xl font-semibold text-slate-900">
              {summary.typeLabel}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{summary.periodLabel}</p>
          </div>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {summary.statusLabel}
          </span>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Objectif principal
          </p>
          <p className="mt-1 text-base font-medium text-slate-900">
            {summary.primaryObjective}
          </p>
          <p className="mt-2 text-sm text-slate-600">{summary.reason}</p>
        </div>

        {summary.measurableTotal > 0 || summary.activitiesLabel ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.activitiesLabel ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Activités
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {summary.activitiesLabel}
                </p>
              </div>
            ) : null}
            {summary.measurableTotal > 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Progression mesurable
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-900">
                  {summary.measurableCompleted} / {summary.measurableTotal}{" "}
                  tâches
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="text-xs leading-relaxed text-slate-500">
          KO Predict™ adapte ce plan à partir de votre progression, de vos
          résultats et de votre rythme de préparation. Le plan sera réévalué à
          la fin de cette période ou lorsqu’un changement majeur de votre
          trajectoire est détecté.
        </p>
      </section>

      <section className="ko-dash-card p-5 sm:p-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
          Tâches
        </h3>
        <ul className="mt-4 space-y-3">
          {active.tasks.map((task) => (
            <TaskCard
              key={task.id}
              title={task.title}
              description={task.description}
              statusLabel={workPlanTaskStatusLabelFr(task.status)}
              progressLabel={
                task.type === "ACTIVITIES"
                  ? formatActivitiesProgress(task)
                  : null
              }
              reason={task.reason}
              measurable={task.measurable}
            />
          ))}
        </ul>
      </section>

      <section className="ko-dash-card p-5 sm:p-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
          Réévaluation
        </h3>
        <p className="mt-3 text-sm text-slate-700">
          KO Predict™ réévaluera votre plan le{" "}
          <span className="font-semibold">{summary.reevaluationLabel}</span>.
        </p>
      </section>

      {previousRows.length > 0 ? (
        <section className="ko-dash-card p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">
            Plans précédents
          </h3>
          <ul className="mt-4 divide-y divide-slate-100">
            {previousRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-slate-900">{row.typeLabel}</p>
                  <p className="text-xs text-slate-500">{row.periodLabel}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-slate-700">{row.statusLabel}</p>
                  {row.activitiesLabel ? (
                    <p className="text-xs text-slate-500">
                      Activités {row.activitiesLabel}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
