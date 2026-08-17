"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { paceKey, riskKey } from "@/lib/i18n/labels";
import type { PaceStatus, RiskLevel } from "@/types/prediction";
import { riskToneClasses } from "@/lib/dashboard/format";
import type { LearnerPredictionUiState } from "@/lib/dashboard/learner-presentation";
import type { MessageKey } from "@/lib/i18n/translate";

interface StatusBannerProps {
  paceStatus: PaceStatus | null;
  riskLevel: RiskLevel | null;
  uiState?: LearnerPredictionUiState;
}

function paceExplanationKey(status: PaceStatus | null): MessageKey {
  switch (status) {
    case "ON_TRACK":
      return "learner.status.onTrack";
    case "SLIGHTLY_BEHIND":
      return "learner.status.extraEffort";
    case "BEHIND":
      return "learner.status.behind";
    case "AHEAD":
      return "learner.status.ahead";
    case "NO_ACTIVITY":
      return "learner.status.noActivity";
    default:
      return "pace.unavailable";
  }
}

function StatusIcon({ collecting }: { collecting: boolean }) {
  if (collecting) {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 12h3l2.5-6 4 12L16 9h5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 1.5" />
    </svg>
  );
}

export function StatusBanner({
  paceStatus,
  riskLevel,
  uiState,
}: StatusBannerProps) {
  const { t } = useLanguage();
  const collecting =
    uiState === "COLLECTING_DATA" || uiState === "INSUFFICIENT_DATA";
  const tone = riskToneClasses(collecting ? null : riskLevel);

  const title = collecting
    ? uiState === "COLLECTING_DATA"
      ? t("learner.status.collecting")
      : t("learner.status.insufficient")
    : t(paceKey(paceStatus));

  return (
    <section
      className={`ko-action-card ko-action-status h-full ${collecting ? "is-collecting" : ""} ${tone.border}`}
      aria-labelledby="status-title"
    >
      <div className="ko-action-top">
        <span className={`ko-action-icon ${collecting ? "is-blue" : ""}`}>
          <StatusIcon collecting={collecting} />
        </span>
        <span className="ko-action-kicker">{t("learner.status.yourSituation")}</span>
      </div>

      <h2 id="status-title" className={`ko-action-title ${tone.text}`}>
        {title}
      </h2>

      {collecting ? (
        <>
          <p className="ko-action-body">{t("learner.status.notFailure")}</p>
          <div className="ko-action-chips">
            <span className="ko-action-chip is-soft">
              <span className="ko-analytics-pulse" />
              {t("learner.status.preparing")}
            </span>
            <span className="ko-action-chip">{t("learner.status.notFailChip")}</span>
          </div>
        </>
      ) : (
        <>
          <p className="ko-action-body">{t(paceExplanationKey(paceStatus))}</p>
          <div className="ko-action-chips">
            <span className="text-sm font-semibold text-slate-600">
              {t("admin.file.riskLevel")}
            </span>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${tone.badge}`}
            >
              {t(riskKey(riskLevel))}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
