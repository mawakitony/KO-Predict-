interface ProbabilityCardProps {
  probability: number | null;
}

export function ProbabilityCard({ probability }: ProbabilityCardProps) {
  return (
    <article className="ko-dash-kpi">
      <div className="flex items-start justify-between gap-2">
        <p className="ko-dash-kpi-label">Probabilité d&apos;être prêt</p>
        {probability != null ? (
          <span className="ko-dash-badge ko-dash-badge-up">
            {Math.round(probability)}%
          </span>
        ) : (
          <span className="ko-dash-badge ko-dash-badge-warn">En attente</span>
        )}
      </div>
      {probability != null ? (
        <>
          <p className="ko-display mt-4 text-3xl font-black tracking-tight text-slate-900">
            {Math.round(probability)} %
          </p>
          <p className="mt-1 text-sm text-slate-500">Estimation KO Predict™</p>
        </>
      ) : (
        <>
          <p className="ko-display mt-4 text-xl font-bold text-slate-700">
            En attente de données
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Disponible après collecte suffisante.
          </p>
        </>
      )}
    </article>
  );
}
