import { formatDateShortFr } from "@/lib/dashboard/format";

interface PredictionCardProps {
  label: string;
  date: string | null;
  emptyMessage?: string;
}

export function PredictionCard({
  label,
  date,
  emptyMessage = "Donnée insuffisante",
}: PredictionCardProps) {
  return (
    <article className="ko-dash-kpi">
      <p className="ko-dash-kpi-label">{label}</p>
      <p className="ko-display mt-4 text-2xl font-black tracking-tight text-slate-900">
        {date ? formatDateShortFr(date) : emptyMessage}
      </p>
    </article>
  );
}
