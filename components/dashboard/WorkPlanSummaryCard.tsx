import Link from "next/link";
import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";
import {
  buildWorkPlanSummaryView,
  type WorkPlanSummaryView,
} from "@/lib/planning/work-plan/presentation";

function EmptyWorkPlanCard({ compact }: { compact?: boolean }) {
  return (
    <section
      className={`ko-dash-card overflow-hidden p-5 sm:p-6${compact ? " is-compact" : ""}`}
      aria-labelledby="work-plan-title"
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        Mon plan de progression
      </p>
      <h2
        id="work-plan-title"
        className="ko-display mt-1 text-xl font-semibold text-slate-900"
      >
        Votre plan arrive bientôt
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        Votre premier plan sera généré automatiquement après la prochaine
        synchronisation.
      </p>
      <p className="mt-4 text-xs text-slate-500">
        KO Predict™ adapte ce plan à partir de votre progression, de vos
        résultats et de votre rythme de préparation.
      </p>
    </section>
  );
}

function SummaryBody({
  summary,
  compact,
}: {
  summary: WorkPlanSummaryView;
  compact?: boolean;
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Mon plan de progression
          </p>
          <h2
            id="work-plan-title"
            className={`ko-display mt-1 font-semibold text-slate-900 ${
              compact ? "text-lg" : "text-xl"
            }`}
          >
            {summary.typeLabel}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{summary.periodLabel}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {summary.statusLabel}
        </span>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-700">
        {summary.primaryObjective}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {summary.activitiesLabel ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Activités
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.activitiesLabel}
            </p>
          </div>
        ) : null}
        {summary.measurableTotal > 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Tâches mesurables
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {summary.measurableCompleted} / {summary.measurableTotal}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href="/plan"
          className="inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Voir mon plan
        </Link>
        <p className="text-xs text-slate-500">
          Réévaluation le {summary.reevaluationLabel}
        </p>
      </div>
    </>
  );
}

/** Résumé dashboard — plan persistant uniquement (pas de faux recalcul). */
export function WorkPlanSummaryCard({
  plan,
  compact = false,
}: {
  plan: PersistedWorkPlan | null;
  compact?: boolean;
}) {
  if (!plan) {
    return <EmptyWorkPlanCard compact={compact} />;
  }

  const summary = buildWorkPlanSummaryView(plan);

  return (
    <section
      className={`ko-dash-card overflow-hidden p-5 sm:p-6${compact ? " is-compact" : ""}`}
      aria-labelledby="work-plan-title"
    >
      <SummaryBody summary={summary} compact={compact} />
    </section>
  );
}
