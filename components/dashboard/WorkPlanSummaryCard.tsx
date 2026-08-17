"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDateShort } from "@/lib/i18n/format-date";
import { planStatusKey, planTypeKey } from "@/lib/i18n/labels";
import type { Locale } from "@/lib/i18n/storage";
import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";
import {
  buildWorkPlanSummaryView,
  type WorkPlanSummaryView,
} from "@/lib/planning/work-plan/presentation";

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

function EmptyWorkPlanCard({ compact }: { compact?: boolean }) {
  const { t } = useLanguage();
  return (
    <section
      className={`ko-plan-summary-card${compact ? " is-compact" : ""}`}
      aria-labelledby="work-plan-title"
    >
      <p className="ko-plan-summary-kicker">{t("learner.planTitle")}</p>
      <h2 id="work-plan-title" className="ko-plan-summary-title">
        {t("learner.plan.soonTitle")}
      </h2>
      <p className="ko-plan-summary-objective">
        {t("learner.plan.soonBody")}
      </p>
      <p className="ko-plan-summary-reeval">{t("learner.plan.soonHint")}</p>
    </section>
  );
}

function SummaryBody({
  plan,
  summary,
  compact,
}: {
  plan: PersistedWorkPlan;
  summary: WorkPlanSummaryView;
  compact?: boolean;
}) {
  const { t, locale } = useLanguage();
  const active = plan.status === "ACTIVE" || summary.status === "ACTIVE";
  const period = formatPlanPeriod(
    plan.startsAt,
    plan.endsAt,
    locale,
    t("learner.plan.periodUnavailable"),
  );

  return (
    <>
      <div className="ko-plan-summary-head">
        <div className="min-w-0">
          <p className="ko-plan-summary-kicker">{t("learner.planTitle")}</p>
          <h2
            id="work-plan-title"
            className={`ko-plan-summary-title${compact ? " is-compact" : ""}`}
          >
            {t(planTypeKey(summary.planType))}
          </h2>
          <p className="ko-plan-summary-period">{period}</p>
        </div>
        <span
          className={`ko-plan-summary-badge${active ? " is-active" : ""}`}
        >
          {t(planStatusKey(summary.status))}
        </span>
      </div>

      <p className="ko-plan-summary-objective">{summary.primaryObjective}</p>

      <div className="ko-plan-summary-stats">
        {summary.activitiesLabel ? (
          <div className="ko-plan-summary-stat">
            <p>{t("admin.plan.activities")}</p>
            <strong>{summary.activitiesLabel}</strong>
          </div>
        ) : null}
        {summary.measurableTotal > 0 ? (
          <div className="ko-plan-summary-stat">
            <p>{t("learner.plan.measurable")}</p>
            <strong>
              {summary.measurableCompleted} / {summary.measurableTotal}
            </strong>
          </div>
        ) : null}
      </div>

      <div className="ko-plan-summary-footer">
        <Link href="/plan" className="ko-plan-summary-cta">
          {t("learner.seePlan")}
        </Link>
        <p className="ko-plan-summary-reeval">
          {t("learner.plan.reeval", {
            date: formatDateShort(plan.endsAt.slice(0, 10), locale),
          })}
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
      <SummaryBody plan={plan} summary={summary} compact={compact} />
    </section>
  );
}
