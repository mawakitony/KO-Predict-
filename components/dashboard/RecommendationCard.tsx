"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { MessageKey } from "@/lib/i18n/translate";

interface RecommendationCardProps {
  action?: string | null;
  actionKey?: MessageKey | null;
  /** Mode collecte : pas de texte secondaire redondant. */
  compact?: boolean;
}

export function RecommendationCard({
  action,
  actionKey = null,
  compact = false,
}: RecommendationCardProps) {
  const { t } = useLanguage();
  const title = actionKey ? t(actionKey) : (action ?? t("learner.reco.fallback"));

  return (
    <section
      className={`ko-action-card ko-action-reco${compact ? " is-compact" : " h-full"}`}
      aria-labelledby="reco-title"
    >
      <div className="ko-action-glow" aria-hidden />

      <div className="ko-action-top">
        <span className="ko-action-icon is-gradient">
          <svg
            viewBox="0 0 24 24"
            className={compact ? "h-5 w-5" : "h-6 w-6"}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </span>
        <span id="reco-title" className="ko-action-kicker is-blue">
          {t("learner.reco.kicker")}
        </span>
      </div>

      <p className="ko-action-title text-slate-900">
        {title}
      </p>
      {!compact ? (
        <p className="ko-action-body">{t("learner.reco.body")}</p>
      ) : null}

      <div className="ko-action-cta-row">
        <span className="ko-dd-reco-cta">
          {t("learner.reco.priority")}
          <span aria-hidden>→</span>
        </span>
        {!compact ? (
          <span className="ko-action-hint">{t("learner.reco.hint")}</span>
        ) : null}
      </div>
    </section>
  );
}
