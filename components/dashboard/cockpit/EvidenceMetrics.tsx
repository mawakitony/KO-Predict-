interface EvidenceMetricsProps {
  progressPercent: number | null;
  completedActivities: number;
  totalActivities: number;
  qcmAverage: number | null;
  recentQcmAverage: number | null;
  currentPace: number | null;
  requiredPace: number | null;
}

function formatPace(value: number | null): string {
  if (value == null) return "Pas encore assez de données";
  const n = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${n} activités / semaine`;
}

export function EvidenceMetrics({
  progressPercent,
  completedActivities,
  totalActivities,
  qcmAverage,
  recentQcmAverage,
  currentPace,
  requiredPace,
}: EvidenceMetricsProps) {
  return (
    <section aria-label="Indicateurs essentiels" className="ko-cockpit-evidence">
      <article className="ko-cockpit-card ko-cockpit-metric">
        <p className="ko-cockpit-kicker">Progression</p>
        <p className="ko-cockpit-metric-value">
          {progressPercent == null
            ? "Pas encore assez de données"
            : `${Math.round(progressPercent)} %`}
        </p>
        <p className="ko-cockpit-muted">
          {completedActivities} / {Math.max(totalActivities, 0)} activités
        </p>
      </article>

      <article className="ko-cockpit-card ko-cockpit-metric">
        <p className="ko-cockpit-kicker">Performance QCM</p>
        <p className="ko-cockpit-metric-value">
          {qcmAverage == null
            ? "Pas encore assez de données"
            : `${Math.round(qcmAverage)} %`}
        </p>
        <p className="ko-cockpit-muted">
          Moyenne récente :{" "}
          {recentQcmAverage == null
            ? "Pas encore assez de données"
            : `${Math.round(recentQcmAverage)} %`}
        </p>
      </article>

      <article className="ko-cockpit-card ko-cockpit-metric">
        <p className="ko-cockpit-kicker">Rythme</p>
        <p className="ko-cockpit-metric-value">{formatPace(currentPace)}</p>
        <p className="ko-cockpit-muted">
          Objectif : {formatPace(requiredPace)}
        </p>
      </article>
    </section>
  );
}
