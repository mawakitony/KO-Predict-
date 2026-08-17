"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatStudyHours } from "@/lib/dashboard/cockpit-copy";
import { formatDate } from "@/lib/i18n/format-date";

interface RecentActivityProps {
  studyTimeMinutes: number;
  lastActivityDate: string | null;
  inactiveDays: number;
  completedActivities: number;
  currentPace: number | null;
}

export function RecentActivity({
  studyTimeMinutes,
  lastActivityDate,
  inactiveDays,
  completedActivities,
  currentPace,
}: RecentActivityProps) {
  const { t, locale } = useLanguage();
  const weekPace =
    currentPace == null
      ? t("learner.cockpit.notEnoughData")
      : t("learner.cockpit.actPerWeek", {
          n: Number.isInteger(currentPace)
            ? currentPace
            : currentPace.toFixed(1),
        });

  return (
    <section
      className="ko-cockpit-card"
      aria-labelledby="activity-title"
    >
      <p className="ko-cockpit-kicker" id="activity-title">
        {t("learner.cockpit.recentActivity")}
      </p>
      <p className="ko-cockpit-section-lead">
        {t("learner.cockpit.recentLead")}
      </p>

      <dl className="ko-cockpit-activity-grid">
        <div>
          <dt>{t("learner.cockpit.observedPace")}</dt>
          <dd>{weekPace}</dd>
        </div>
        <div>
          <dt>{t("learner.cockpit.studyTime")}</dt>
          <dd>{formatStudyHours(studyTimeMinutes, locale)}</dd>
        </div>
        <div>
          <dt>{t("learner.cockpit.lastActivity")}</dt>
          <dd>
            {lastActivityDate
              ? formatDate(lastActivityDate, locale)
              : t("learner.cockpit.notEnoughData")}
          </dd>
        </div>
        <div>
          <dt>{t("learner.cockpit.inactivityDays")}</dt>
          <dd>
            {inactiveDays <= 0
              ? t("learner.cockpit.recentYes")
              : inactiveDays === 1
                ? t("learner.dayOne")
                : t("learner.dayMany", { n: inactiveDays })}
          </dd>
        </div>
        <div>
          <dt>{t("learner.cockpit.completed")}</dt>
          <dd>{completedActivities}</dd>
        </div>
      </dl>
    </section>
  );
}
