import { buildAvailableMetrics } from "@/lib/dashboard/available-metrics";

interface AvailableMetricsStripProps {
  progressPercent: number | null;
  completedActivities: number;
  totalActivities: number;
  studyTimeMinutes: number;
  qcmAverage: number | null;
  inactiveDays: number;
}

/** Zone compacte — uniquement les métriques utiles (null ≠ 0). */
export function AvailableMetricsStrip(props: AvailableMetricsStripProps) {
  const items = buildAvailableMetrics(props);

  return (
    <section aria-label="Données disponibles" className="ko-collect-metrics">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        Données disponibles
      </p>
      <ul className="ko-collect-metrics-grid">
        {items.map((item) => (
          <li key={item.key} className="ko-collect-metric">
            <p className="ko-collect-metric-label">{item.label}</p>
            <p className="ko-collect-metric-value">{item.value}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
