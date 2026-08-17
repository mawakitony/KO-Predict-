"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  cockpitHeroNarrative,
  cockpitRiskLabel,
  cockpitRiskTone,
} from "@/lib/dashboard/cockpit-copy";
import type { PaceStatus, RiskLevel } from "@/types/prediction";

interface ReadinessHeroProps {
  displayName: string;
  certification: string;
  readinessScore: number | null;
  readinessProbability: number | null;
  riskLevel: RiskLevel | null;
  paceStatus: PaceStatus | null;
  currentPace: number | null;
  requiredPace: number | null;
  collecting: boolean;
}

export function ReadinessHero({
  displayName,
  certification,
  readinessScore,
  readinessProbability,
  riskLevel,
  paceStatus,
  currentPace,
  requiredPace,
  collecting,
}: ReadinessHeroProps) {
  const { t, locale } = useLanguage();
  const tone = collecting ? "neutral" : cockpitRiskTone(riskLevel);
  const riskText = collecting
    ? t("learner.status.preparing")
    : cockpitRiskLabel(riskLevel, locale);
  const narrative = collecting
    ? t("learner.heroUnavailable")
    : cockpitHeroNarrative(
        {
          paceStatus,
          currentPace,
          requiredPace,
          readinessScore,
        },
        locale,
      );

  return (
    <section
      className={`ko-cockpit-hero is-${tone}`}
      aria-labelledby="cockpit-hero-title"
    >
      <p className="ko-cockpit-kicker">KO Predict™</p>
      <p className="ko-cockpit-hello">
        {t("chrome.hello", { name: displayName })}
      </p>
      <h2 id="cockpit-hero-title" className="ko-cockpit-hero-title">
        {t("learner.cockpit.prepFor", { certification })}
      </h2>

      <div className="ko-cockpit-hero-grid">
        <div className="ko-cockpit-score-block">
          <p className="ko-cockpit-score-label">
            {t("learner.cockpit.readinessLevel")}
          </p>
          {readinessScore == null ? (
            <p className="ko-cockpit-score-empty">
              {t("learner.cockpit.estimationOngoing")}
            </p>
          ) : (
            <p className="ko-cockpit-score">
              <span className="ko-cockpit-score-num">
                {Math.round(readinessScore)}
              </span>
              <span className="ko-cockpit-score-den">/ 100</span>
            </p>
          )}
          <p className="ko-cockpit-score-caption">
            {t("learner.cockpit.scoreOn100")}
          </p>
        </div>

        <div className="ko-cockpit-hero-side">
          <div
            className={`ko-cockpit-badge is-${tone}`}
            role="status"
            aria-label={t("learner.cockpit.statusAria", { status: riskText })}
          >
            {riskText}
          </div>

          <div className="ko-cockpit-prob">
            <p className="ko-cockpit-prob-label">
              {t("learner.cockpit.successProb")}
            </p>
            {readinessProbability == null ? (
              <p className="ko-cockpit-prob-value is-empty">
                {t("learner.cockpit.notEnoughData")}
              </p>
            ) : (
              <p className="ko-cockpit-prob-value">
                {Math.round(readinessProbability)} %
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="ko-cockpit-narrative">{narrative}</p>
    </section>
  );
}
