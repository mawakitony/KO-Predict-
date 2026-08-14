interface PaceCardProps {
  label: string;
  value: number | null;
  emptyMessage?: string;
}

export function PaceCard({
  label,
  value,
  emptyMessage = "Pas encore assez d'activité pour calculer votre rythme.",
}: PaceCardProps) {
  return (
    <article className="ko-dash-kpi">
      <p className="ko-dash-kpi-label">{label}</p>
      {value != null ? (
        <>
          <p className="ko-display mt-4 text-3xl font-black tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-sm text-slate-500">activités / semaine</p>
        </>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-slate-500">
          {emptyMessage}
        </p>
      )}
    </article>
  );
}
