import type { PaceStatus, RiskLevel } from "@/types/prediction";
import {
  paceStatusLabel,
  riskLabel,
  riskToneClasses,
} from "@/lib/dashboard/format";
import type { LearnerPredictionUiState } from "@/lib/dashboard/learner-presentation";

interface StatusBannerProps {
  paceStatus: PaceStatus | null;
  riskLevel: RiskLevel | null;
  uiState?: LearnerPredictionUiState;
}

function paceExplanation(status: PaceStatus | null): string {
  switch (status) {
    case "ON_TRACK":
      return "Vous avancez au bon rythme pour viser votre date d’examen.";
    case "SLIGHTLY_BEHIND":
      return "Un petit effort supplémentaire vous remettra sur la bonne trajectoire.";
    case "BEHIND":
      return "Votre rythme est insuffisant pour la date cible. Augmentez vos activités cette semaine.";
    case "AHEAD":
      return "Vous êtes en avance : maintenez ce rythme pour arriver serein le jour J.";
    case "NO_ACTIVITY":
      return "Aucune activité récente détectée. Reprenez votre formation pour mettre à jour l’estimation.";
    default:
      return "Le statut de rythme n’est pas encore disponible.";
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
  const collecting =
    uiState === "COLLECTING_DATA" || uiState === "INSUFFICIENT_DATA";
  const tone = riskToneClasses(collecting ? null : riskLevel);

  const title = collecting
    ? uiState === "COLLECTING_DATA"
      ? "Collecte de données en cours"
      : "Données insuffisantes pour une estimation complète"
    : paceStatusLabel(paceStatus);

  return (
    <section
      className={`ko-action-card ko-action-status h-full ${collecting ? "is-collecting" : ""} ${tone.border}`}
      aria-labelledby="status-title"
    >
      <div className="ko-action-top">
        <span className={`ko-action-icon ${collecting ? "is-blue" : ""}`}>
          <StatusIcon collecting={collecting} />
        </span>
        <span className="ko-action-kicker">Votre situation</span>
      </div>

      <h2 id="status-title" className={`ko-action-title ${tone.text}`}>
        {title}
      </h2>

      {collecting ? (
        <>
          <p className="ko-action-body">
            Ce n&apos;est pas un mauvais résultat : KO Predict™ n&apos;a pas
            encore assez d&apos;informations pour évaluer votre préparation.
          </p>
          <div className="ko-action-chips">
            <span className="ko-action-chip is-soft">
              <span className="ko-analytics-pulse" />
              Estimation en préparation
            </span>
            <span className="ko-action-chip">Pas un échec</span>
          </div>
        </>
      ) : (
        <>
          <p className="ko-action-body">{paceExplanation(paceStatus)}</p>
          <div className="ko-action-chips">
            <span className="text-sm font-semibold text-slate-600">
              Niveau de risque
            </span>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${tone.badge}`}
            >
              {riskLabel(riskLevel)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
