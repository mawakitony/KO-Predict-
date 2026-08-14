interface RecommendationCardProps {
  action: string | null;
  /** Mode collecte : pas de texte secondaire redondant. */
  compact?: boolean;
}

export function RecommendationCard({
  action,
  compact = false,
}: RecommendationCardProps) {
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
          À faire maintenant
        </span>
      </div>

      <p className="ko-action-title text-slate-900">
        {action ??
          "Continuez votre formation : KO Predict™ affinera bientôt votre estimation."}
      </p>
      {!compact ? (
        <p className="ko-action-body">
          Suivez cette action pour améliorer votre trajectoire vers
          l&apos;examen.
        </p>
      ) : null}

      <div className="ko-action-cta-row">
        <span className="ko-dd-reco-cta">
          Priorité du moment
          <span aria-hidden>→</span>
        </span>
        {!compact ? (
          <span className="ko-action-hint">1 action claire</span>
        ) : null}
      </div>
    </section>
  );
}
