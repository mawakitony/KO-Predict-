import type { WeeklyPlan, WeeklyPlanStatus } from "@/lib/planning/weekly-plan";
import { round1 } from "@/lib/prediction/math";

function statusLabel(status: WeeklyPlanStatus): string {
  switch (status) {
    case "INSUFFICIENT_DATA":
      return "En construction";
    case "NO_ACTIVITY":
      return "Reprise";
    case "BEHIND":
      return "À accélérer";
    case "SLIGHTLY_BEHIND":
      return "Léger retard";
    case "ON_TRACK":
      return "Dans les clous";
    case "AHEAD":
      return "En avance";
    case "COMPLETE":
      return "Révision";
    default:
      return "Plan";
  }
}

function statusTone(status: WeeklyPlanStatus): string {
  switch (status) {
    case "BEHIND":
    case "NO_ACTIVITY":
      return "is-urgent";
    case "SLIGHTLY_BEHIND":
      return "is-watch";
    case "ON_TRACK":
    case "AHEAD":
      return "is-ok";
    case "COMPLETE":
      return "is-review";
    default:
      return "is-build";
  }
}

function formatPace(value: number): string {
  return Number.isInteger(value) ? String(value) : String(round1(value));
}

export function WeeklyPlanCard({
  plan,
  compact = false,
}: {
  plan: WeeklyPlan;
  compact?: boolean;
}) {
  const showPaceGap =
    (plan.status === "BEHIND" ||
      plan.status === "SLIGHTLY_BEHIND" ||
      plan.status === "ON_TRACK" ||
      plan.status === "AHEAD") &&
    plan.currentPace != null &&
    plan.requiredPace != null;

  return (
    <section
      className={`ko-week-card${compact ? " is-compact" : ""} ${statusTone(plan.status)}`}
      aria-labelledby="weekly-plan-title"
    >
      <div className="ko-week-glow" aria-hidden />

      <div className="ko-week-top">
        <span className="ko-week-icon" aria-hidden>
          <svg
            viewBox="0 0 24 24"
            className={compact ? "h-5 w-5" : "h-6 w-6"}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18" />
            <path d="M8 3v4M16 3v4" />
            <path d="M8 14h3M13 14h3M8 17h8" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="ko-week-kicker">Votre plan cette semaine</p>
          <h2 id="weekly-plan-title" className="ko-week-title">
            {plan.primaryAction}
          </h2>
        </div>
        <span className="ko-week-badge">{statusLabel(plan.status)}</span>
      </div>

      <p className="ko-week-reason">{plan.reason}</p>

      {showPaceGap ? (
        <div className="ko-week-pace" aria-label="Rythme actuel et cible">
          <div>
            <p className="ko-week-pace-label">Rythme actuel</p>
            <p className="ko-week-pace-value">
              {formatPace(plan.currentPace!)}
              <span> / semaine</span>
            </p>
          </div>
          <div>
            <p className="ko-week-pace-label">Rythme cible</p>
            <p className="ko-week-pace-value">
              {formatPace(plan.requiredPace!)}
              <span> / semaine</span>
            </p>
          </div>
        </div>
      ) : null}

      {plan.targetActivities != null ? (
        <div className="ko-week-objective">
          <p className="ko-week-objective-label">Objectif</p>
          <p className="ko-week-objective-value">
            {plan.targetActivities} activité
            {plan.targetActivities > 1 ? "s" : ""} cette semaine
          </p>
        </div>
      ) : null}

      {plan.emphasizeQcm ? (
        <p className="ko-week-qcm">
          Réalisez plusieurs QCM cette semaine afin de renforcer la fiabilité
          de votre estimation.
        </p>
      ) : null}
    </section>
  );
}
