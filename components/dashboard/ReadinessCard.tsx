import type { RiskLevel } from "@/types/prediction";
import { formatScore } from "@/lib/dashboard/format";
import { learnerRiskDisplay } from "@/lib/dashboard/learner-presentation";

interface ReadinessCardProps {
  score: number | null;
  riskLevel: RiskLevel | null;
  collectingData?: boolean;
  variant?: "default" | "kpi";
}

export function ReadinessCard({
  score,
  riskLevel,
  collectingData = false,
  variant = "default",
}: ReadinessCardProps) {
  const unavailable = score == null;
  const risk = learnerRiskDisplay(riskLevel);

  if (variant === "kpi") {
    return (
      <article className="ko-dash-kpi" aria-labelledby="readiness-title">
        <div className="flex items-start justify-between gap-2">
          <p className="ko-dash-kpi-label">Préparation</p>
          <span
            className={`ko-dash-badge ${
              unavailable ? "ko-dash-badge-warn" : "ko-dash-badge-up"
            }`}
          >
            {unavailable
              ? collectingData
                ? "Collecte"
                : "En attente"
              : "OK"}
          </span>
        </div>
        <h2
          id="readiness-title"
          className="ko-display mt-5 text-[1.85rem] font-black tracking-tight text-slate-900"
        >
          {!unavailable ? (
            <>
              {formatScore(score)}
              <span className="text-base font-semibold text-slate-400">
                {" "}
                / 100
              </span>
            </>
          ) : (
            <span className="text-xl font-bold text-slate-700">—</span>
          )}
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          {unavailable ? "Estimation en préparation" : risk.title}
        </p>
      </article>
    );
  }

  return (
    <section className="ko-dash-card px-6 py-8 sm:px-10" aria-labelledby="readiness-title">
      <p className="ko-dash-kpi-label">Votre niveau de préparation</p>
      <h2
        id="readiness-title"
        className="ko-display mt-3 text-5xl font-semibold tracking-tight text-slate-900"
      >
        {!unavailable ? formatScore(score) : "En préparation"}
      </h2>
    </section>
  );
}
