import type { RiskLevel } from "@/types/prediction";
import { learnerRiskDisplay } from "@/lib/dashboard/learner-presentation";

interface RiskCardProps {
  riskLevel: RiskLevel | null;
}

export function RiskCard({ riskLevel }: RiskCardProps) {
  const display = learnerRiskDisplay(riskLevel);
  const tone =
    riskLevel === "GREEN"
      ? "up"
      : riskLevel === "AMBER"
        ? "warn"
        : riskLevel === "RED" || riskLevel === "CRITICAL"
          ? "down"
          : "warn";

  return (
    <article className="ko-dash-kpi">
      <div className="flex items-start justify-between gap-2">
        <p className="ko-dash-kpi-label">Niveau de risque</p>
        <span
          className={`ko-dash-badge ${
            tone === "up"
              ? "ko-dash-badge-up"
              : tone === "down"
                ? "ko-dash-badge-down"
                : "ko-dash-badge-warn"
          }`}
        >
          {display.title}
        </span>
      </div>
      <p className="ko-display mt-4 text-2xl font-black tracking-tight text-slate-900">
        {display.title}
      </p>
      <p className="mt-1 text-sm text-slate-500">{display.detail}</p>
    </article>
  );
}
