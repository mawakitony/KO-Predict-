import Link from "next/link";
import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";
import {
  buildWorkPlanSummaryView,
  type WorkPlanSummaryView,
} from "@/lib/planning/work-plan/presentation";

function EmptyWorkPlanCard({ compact }: { compact?: boolean }) {
  return (
    <section
      className={`ko-plan-summary-card${compact ? " is-compact" : ""}`}
      aria-labelledby="work-plan-title"
    >
      <p className="ko-plan-summary-kicker">Mon plan de progression</p>
      <h2 id="work-plan-title" className="ko-plan-summary-title">
        Votre plan arrive bientôt
      </h2>
      <p className="ko-plan-summary-objective">
        Votre premier plan sera généré automatiquement après la prochaine
        synchronisation.
      </p>
      <p className="ko-plan-summary-reeval">
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
  const active = summary.statusLabel === "En cours";

  return (
    <>
      <div className="ko-plan-summary-head">
        <div className="min-w-0">
          <p className="ko-plan-summary-kicker">Mon plan de progression</p>
          <h2
            id="work-plan-title"
            className={`ko-plan-summary-title${compact ? " is-compact" : ""}`}
          >
            {summary.typeLabel}
          </h2>
          <p className="ko-plan-summary-period">{summary.periodLabel}</p>
        </div>
        <span
          className={`ko-plan-summary-badge${active ? " is-active" : ""}`}
        >
          {summary.statusLabel}
        </span>
      </div>

      <p className="ko-plan-summary-objective">{summary.primaryObjective}</p>

      <div className="ko-plan-summary-stats">
        {summary.activitiesLabel ? (
          <div className="ko-plan-summary-stat">
            <p>Activités</p>
            <strong>{summary.activitiesLabel}</strong>
          </div>
        ) : null}
        {summary.measurableTotal > 0 ? (
          <div className="ko-plan-summary-stat">
            <p>Tâches mesurables</p>
            <strong>
              {summary.measurableCompleted} / {summary.measurableTotal}
            </strong>
          </div>
        ) : null}
      </div>

      <div className="ko-plan-summary-footer">
        <Link href="/plan" className="ko-plan-summary-cta">
          Voir mon plan
        </Link>
        <p className="ko-plan-summary-reeval">
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
      className={`ko-plan-summary-card${compact ? " is-compact" : ""}`}
      aria-labelledby="work-plan-title"
    >
      <SummaryBody summary={summary} compact={compact} />
    </section>
  );
}
