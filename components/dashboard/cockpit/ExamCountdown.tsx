"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  cockpitCountdownInterpretation,
  cockpitDaysUntil,
} from "@/lib/dashboard/cockpit-copy";
import { formatDate } from "@/lib/i18n/format-date";

interface ExamCountdownProps {
  targetExamDate: string | null;
  predictedReadinessDate: string | null;
  trajectoryHeadline: string | null;
}

export function ExamCountdown({
  targetExamDate,
  predictedReadinessDate,
  trajectoryHeadline,
}: ExamCountdownProps) {
  const { t, locale } = useLanguage();
  const days = cockpitDaysUntil(targetExamDate);
  const interpretation = cockpitCountdownInterpretation(
    {
      targetExamDate,
      predictedReadinessDate,
    },
    locale,
  );

  let jLabel: string | null = null;
  if (days != null) {
    if (days > 0) jLabel = t("learner.dayMinus", { n: days });
    else if (days === 0) jLabel = t("learner.collection.examDay");
    else jLabel = t("learner.dayPlus", { n: Math.abs(days) });
  }

  return (
    <section
      className="ko-cockpit-card ko-cockpit-countdown"
      aria-labelledby="countdown-title"
    >
      <p className="ko-cockpit-kicker" id="countdown-title">
        {t("learner.collection.examShort")}
      </p>

      {!targetExamDate ? (
        <>
          <p className="ko-cockpit-countdown-empty">
            {t("learner.dates.examMissing")}
          </p>
          <p className="ko-cockpit-muted mt-2">
            {t("learner.examCountdownMissing")}
          </p>
        </>
      ) : (
        <>
          <p
            className="ko-cockpit-jlabel"
            aria-label={t("learner.collection.countdownAria", {
              label: jLabel ?? "",
            })}
          >
            {jLabel}
          </p>
          <p className="ko-cockpit-exam-date">
            {formatDate(targetExamDate, locale)}
          </p>

          <div className="ko-cockpit-ready-line">
            <span>{t("learner.dates.estimatedReady")}</span>
            <strong>
              {predictedReadinessDate
                ? formatDate(predictedReadinessDate, locale)
                : t("learner.cockpit.notEnoughData")}
            </strong>
          </div>

          {interpretation ? (
            <p className="ko-cockpit-interpretation">{interpretation}</p>
          ) : null}

          {trajectoryHeadline ? (
            <p className="ko-cockpit-traj-note">{trajectoryHeadline}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
