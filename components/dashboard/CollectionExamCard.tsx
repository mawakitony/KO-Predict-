"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { cockpitDaysUntil } from "@/lib/dashboard/cockpit-copy";
import { formatDate } from "@/lib/i18n/format-date";

interface CollectionExamCardProps {
  targetExamDate: string | null;
  certification: string;
}

/** Examen / J-n en mode collecte — compact, professionnel. */
export function CollectionExamCard({
  targetExamDate,
  certification,
}: CollectionExamCardProps) {
  const { t, locale } = useLanguage();
  const days = cockpitDaysUntil(targetExamDate);

  let jLabel: string | null = null;
  if (days != null) {
    if (days > 0) jLabel = t("learner.dayMinus", { n: days });
    else if (days === 0) jLabel = t("learner.collection.examDay");
    else jLabel = t("learner.dayPlus", { n: Math.abs(days) });
  }

  return (
    <section
      id="learner-dates"
      className="ko-collect-exam"
      aria-labelledby="exam-collect-title"
    >
      <p id="exam-collect-title" className="ko-collect-exam-kicker">
        {t("learner.collection.examYours", { certification })}
      </p>

      {!targetExamDate ? (
        <p className="ko-collect-exam-missing">
          {t("learner.dates.examMissing")}
        </p>
      ) : (
        <div className="ko-collect-exam-row">
          <p className="ko-collect-exam-j">{jLabel}</p>
          <span className="ko-collect-exam-sep" aria-hidden />
          <p className="ko-collect-exam-date">
            {formatDate(targetExamDate, locale)}
          </p>
          <span className="ko-collect-exam-sep is-desktop" aria-hidden />
          <p className="ko-collect-exam-note">
            {t("learner.collection.examNote")}
          </p>
        </div>
      )}
    </section>
  );
}
