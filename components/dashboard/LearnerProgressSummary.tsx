"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  formatPercentOrDash,
  formatSyncRelative,
} from "@/lib/learning/format";

interface LearnerProgressSummaryProps {
  progressPercent: number | null;
  completedActivities: number;
  totalActivities: number;
  qcmAverage: number | null;
  recentQcmAverage: number | null;
  recordedAt: string | null;
  collecting?: boolean;
}

export function LearnerProgressSummary({
  progressPercent,
  completedActivities,
  totalActivities,
  qcmAverage,
  recentQcmAverage,
  recordedAt,
  collecting = false,
}: LearnerProgressSummaryProps) {
  const { t, locale } = useLanguage();
  const hasQcm = qcmAverage != null;
  const empty =
    collecting ||
    ((progressPercent == null || progressPercent === 0) &&
      completedActivities === 0 &&
      !hasQcm);

  return (
    <section
      className="ko-lw-progress"
      aria-labelledby="learner-progress-title"
    >
      <p className="ko-lw-progress-kicker">{t("learner.progressKicker")}</p>
      <h2 id="learner-progress-title" className="ko-lw-progress-title">
        {t("learner.learningTitle")}
      </h2>
      <p className="ko-lw-progress-sync">
        {formatSyncRelative(recordedAt, locale)}
      </p>

      {empty ? (
        <div className="ko-lw-progress-empty">
          <p>{t("learner.progressUi.emptyLead")}</p>
          <p>{t("learner.progressContinue")}</p>
        </div>
      ) : (
        <div className="ko-lw-progress-grid">
          <Stat
            label={t("admin.file.progress")}
            value={formatPercentOrDash(progressPercent)}
          />
          <Stat
            label={t("learner.progressUi.completed")}
            value={`${completedActivities} / ${totalActivities || "—"}`}
          />
          <Stat
            label={t("admin.file.qcmAverage")}
            value={
              hasQcm
                ? formatPercentOrDash(qcmAverage)
                : t("learner.progressUi.noResult")
            }
          />
          <Stat
            label={t("learner.progressUi.recentAvg")}
            value={
              recentQcmAverage == null
                ? "—"
                : formatPercentOrDash(recentQcmAverage)
            }
          />
        </div>
      )}

      <div className="ko-lw-progress-actions">
        <Link href="/learning?tab=activities" className="ko-lw-progress-cta">
          {t("learner.seeActivities")}
        </Link>
        <Link
          href="/learning?tab=quizzes"
          className="ko-lw-progress-cta is-ghost"
        >
          {t("learner.progressUi.seeQuizzes")}
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ko-lw-progress-stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
