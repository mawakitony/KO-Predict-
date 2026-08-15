import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";
import {
  buildPreviousPlanRow,
  buildWorkPlanSummaryView,
  workPlanTaskStatusLabelFr,
  formatActivitiesProgress,
} from "@/lib/planning/work-plan/presentation";

/**
 * Lecture seule coach/admin — données persistées, aucun recalcul métier.
 */
export function AdminWorkPlanPanel({
  active,
  previousLatest,
}: {
  active: PersistedWorkPlan | null;
  previousLatest: PersistedWorkPlan | null;
}) {
  if (!active) {
    return (
      <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
        <h2 className="ko-display text-base font-semibold text-slate-900">
          Plan de progression actuel
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          Aucun plan de progression actif pour cet apprenant.
        </p>
        {previousLatest ? (
          <PreviousCompact plan={previousLatest} />
        ) : null}
      </section>
    );
  }

  const summary = buildWorkPlanSummaryView(active);

  return (
    <section className="rounded-[1.5rem] bg-white p-5 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Lecture seule
          </p>
          <h2 className="ko-display mt-1 text-base font-semibold text-slate-900">
            Plan de progression actuel
          </h2>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
          {summary.statusLabel}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Type
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900">
            {summary.typeLabel}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Période
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900">
            {summary.periodLabel}
          </dd>
        </div>
        {summary.activitiesLabel ? (
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Activités
            </dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">
              {summary.activitiesLabel}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Réévaluation
          </dt>
          <dd className="mt-0.5 text-sm font-semibold text-slate-900">
            {summary.reevaluationLabel}
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-sm text-slate-600">{summary.primaryObjective}</p>

      <h3 className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Tâches principales
      </h3>
      <ul className="mt-2 space-y-2">
        {active.tasks.map((task) => {
          const progress =
            task.type === "ACTIVITIES"
              ? formatActivitiesProgress(task)
              : null;
          return (
            <li
              key={task.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{task.title}</p>
                {!task.measurable ? (
                  <p className="text-xs text-slate-500">Orientation</p>
                ) : null}
              </div>
              <div className="text-right text-xs font-semibold text-slate-600">
                {progress ? <p>{progress}</p> : null}
                <p>{workPlanTaskStatusLabelFr(task.status)}</p>
              </div>
            </li>
          );
        })}
      </ul>

      {previousLatest ? <PreviousCompact plan={previousLatest} /> : null}
    </section>
  );
}

function PreviousCompact({ plan }: { plan: PersistedWorkPlan }) {
  const row = buildPreviousPlanRow(plan);
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Dernier plan précédent
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <div>
          <p className="font-semibold text-slate-800">{row.typeLabel}</p>
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
      </div>
    </div>
  );
}
