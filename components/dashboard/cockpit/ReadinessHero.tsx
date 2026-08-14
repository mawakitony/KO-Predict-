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
  const tone = collecting ? "neutral" : cockpitRiskTone(riskLevel);
  const riskText = collecting
    ? "Estimation en préparation"
    : cockpitRiskLabel(riskLevel);
  const narrative = collecting
    ? "Votre estimation n’est pas encore disponible."
    : cockpitHeroNarrative({
        paceStatus,
        currentPace,
        requiredPace,
        readinessScore,
      });

  return (
    <section
      className={`ko-cockpit-hero is-${tone}`}
      aria-labelledby="cockpit-hero-title"
    >
      <p className="ko-cockpit-kicker">KO Predict™</p>
      <p className="ko-cockpit-hello">Bonjour, {displayName}</p>
      <h2 id="cockpit-hero-title" className="ko-cockpit-hero-title">
        Votre préparation au {certification}
      </h2>

      <div className="ko-cockpit-hero-grid">
        <div className="ko-cockpit-score-block">
          <p className="ko-cockpit-score-label">Niveau de préparation</p>
          {readinessScore == null ? (
            <p className="ko-cockpit-score-empty">Estimation en cours</p>
          ) : (
            <p className="ko-cockpit-score">
              <span className="ko-cockpit-score-num">
                {Math.round(readinessScore)}
              </span>
              <span className="ko-cockpit-score-den">/ 100</span>
            </p>
          )}
          <p className="ko-cockpit-score-caption">Score sur 100</p>
        </div>

        <div className="ko-cockpit-hero-side">
          <div
            className={`ko-cockpit-badge is-${tone}`}
            role="status"
            aria-label={`Statut : ${riskText}`}
          >
            {riskText}
          </div>

          <div className="ko-cockpit-prob">
            <p className="ko-cockpit-prob-label">
              Probabilité estimée de réussite
            </p>
            {readinessProbability == null ? (
              <p className="ko-cockpit-prob-value is-empty">
                Pas encore assez de données
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
