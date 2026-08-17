"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { WeeklyPlan, WeeklyPlanStatus } from "@/lib/planning/weekly-plan";
import { round1 } from "@/lib/prediction/math";
import type { MessageKey } from "@/lib/i18n/translate";

function statusKey(status: WeeklyPlanStatus): MessageKey {
  switch (status) {
    case "INSUFFICIENT_DATA":
      return "learner.week.statusBuild";
    case "NO_ACTIVITY":
      return "learner.week.statusResume";
    case "BEHIND":
      return "learner.week.statusBehind";
    case "SLIGHTLY_BEHIND":
      return "learner.week.statusSlight";
    case "ON_TRACK":
      return "learner.week.statusOnTrack";
    case "AHEAD":
      return "learner.week.statusAhead";
    case "COMPLETE":
      return "learner.week.statusReview";
    default:
      return "learner.week.statusPlan";
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
  const { t } = useLanguage();
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
          <p className="ko-week-kicker">{t("learner.week.kicker")}</p>
          <h2 id="weekly-plan-title" className="ko-week-title">
            {plan.primaryAction}
          </h2>
        </div>
        <span className="ko-week-badge">{t(statusKey(plan.status))}</span>
      </div>

      <p className="ko-week-reason">{plan.reason}</p>

      {showPaceGap ? (
        <div className="ko-week-pace" aria-label={t("learner.week.paceAria")}>
          <div>
            <p className="ko-week-pace-label">{t("learner.traj.currentPace")}</p>
            <p className="ko-week-pace-value">
              {formatPace(plan.currentPace!)}
              <span> {t("learner.week.perWeek")}</span>
            </p>
          </div>
          <div>
            <p className="ko-week-pace-label">{t("learner.traj.targetPace")}</p>
            <p className="ko-week-pace-value">
              {formatPace(plan.requiredPace!)}
              <span> {t("learner.week.perWeek")}</span>
            </p>
          </div>
        </div>
      ) : null}

      {plan.targetActivities != null ? (
        <div className="ko-week-objective">
          <p className="ko-week-objective-label">{t("learner.week.objective")}</p>
          <p className="ko-week-objective-value">
            {plan.targetActivities === 1
              ? t("learner.week.activityOne")
              : t("learner.week.activityMany", { n: plan.targetActivities })}
          </p>
        </div>
      ) : null}

      {plan.emphasizeQcm ? (
        <p className="ko-week-qcm">{t("learner.week.emphasizeQcm")}</p>
      ) : null}
    </section>
  );
}
