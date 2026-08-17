"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

interface EvidenceMetricsProps {
  progressPercent: number | null;
  completedActivities: number;
  totalActivities: number;
  qcmAverage: number | null;
  recentQcmAverage: number | null;
  currentPace: number | null;
  requiredPace: number | null;
}

export function EvidenceMetrics({
  progressPercent,
  completedActivities,
  totalActivities,
  qcmAverage,
  recentQcmAverage,
  currentPace,
  requiredPace,
}: EvidenceMetricsProps) {
  const { t } = useLanguage();

  function formatPace(value: number | null): string {
    if (value == null) return t("learner.cockpit.notEnoughData");
    const n = Number.isInteger(value) ? String(value) : value.toFixed(1);
    return t("learner.activitiesPerWeek", { n });
  }

  return (
    <section
      aria-label={t("learner.cockpit.evidenceAria")}
      className="ko-cockpit-evidence"
    >
      <article className="ko-cockpit-card ko-cockpit-metric">
        <p className="ko-cockpit-kicker">{t("admin.file.progress")}</p>
        <p className="ko-cockpit-metric-value">
          {progressPercent == null
            ? t("learner.cockpit.notEnoughData")
            : `${Math.round(progressPercent)} %`}
        </p>
        <p className="ko-cockpit-muted">
          {t("learner.progressUi.activitiesCount", {
            completed: completedActivities,
            total: Math.max(totalActivities, 0),
          })}
        </p>
      </article>

      <article className="ko-cockpit-card ko-cockpit-metric">
        <p className="ko-cockpit-kicker">{t("learner.cockpit.qcmPerf")}</p>
        <p className="ko-cockpit-metric-value">
          {qcmAverage == null
            ? t("learner.cockpit.notEnoughData")
            : `${Math.round(qcmAverage)} %`}
        </p>
        <p className="ko-cockpit-muted">
          {t("learner.cockpit.recentAvg", {
            value:
              recentQcmAverage == null
                ? t("learner.cockpit.notEnoughData")
                : `${Math.round(recentQcmAverage)} %`,
          })}
        </p>
      </article>

      <article className="ko-cockpit-card ko-cockpit-metric">
        <p className="ko-cockpit-kicker">{t("admin.file.activityPace")}</p>
        <p className="ko-cockpit-metric-value">{formatPace(currentPace)}</p>
        <p className="ko-cockpit-muted">
          {t("learner.cockpit.objective", { value: formatPace(requiredPace) })}
        </p>
      </article>
    </section>
  );
}
