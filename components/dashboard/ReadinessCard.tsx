"use client";

import type { RiskLevel } from "@/types/prediction";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatScore } from "@/lib/dashboard/format";
import { riskKey } from "@/lib/i18n/labels";

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
  const { t } = useLanguage();
  const unavailable = score == null;

  if (variant === "kpi") {
    return (
      <article className="ko-dash-kpi" aria-labelledby="readiness-title">
        <div className="flex items-start justify-between gap-2">
          <p className="ko-dash-kpi-label">{t("admin.file.preparation")}</p>
          <span
            className={`ko-dash-badge ${
              unavailable ? "ko-dash-badge-warn" : "ko-dash-badge-up"
            }`}
          >
            {unavailable
              ? collectingData
                ? t("learner.kpi.collecting")
                : t("learner.kpi.waiting")
              : t("learner.kpi.ok")}
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
          {unavailable
            ? t("learner.status.preparing")
            : t(riskKey(riskLevel))}
        </p>
      </article>
    );
  }

  return (
    <section className="ko-dash-card px-6 py-8 sm:px-10" aria-labelledby="readiness-title">
      <p className="ko-dash-kpi-label">{t("learner.kpi.yourReadiness")}</p>
      <h2
        id="readiness-title"
        className="ko-display mt-3 text-5xl font-semibold tracking-tight text-slate-900"
      >
        {!unavailable ? formatScore(score) : t("learner.kpi.inPreparation")}
      </h2>
    </section>
  );
}
