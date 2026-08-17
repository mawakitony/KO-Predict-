"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

interface ProbabilityCardProps {
  probability: number | null;
}

export function ProbabilityCard({ probability }: ProbabilityCardProps) {
  const { t } = useLanguage();
  return (
    <article className="ko-dash-kpi">
      <div className="flex items-start justify-between gap-2">
        <p className="ko-dash-kpi-label">{t("learner.kpi.probReady")}</p>
        {probability != null ? (
          <span className="ko-dash-badge ko-dash-badge-up">
            {Math.round(probability)}%
          </span>
        ) : (
          <span className="ko-dash-badge ko-dash-badge-warn">
            {t("learner.kpi.waiting")}
          </span>
        )}
      </div>
      {probability != null ? (
        <>
          <p className="ko-display mt-4 text-3xl font-black tracking-tight text-slate-900">
            {Math.round(probability)} %
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {t("learner.dates.koEstimate")}
          </p>
        </>
      ) : (
        <>
          <p className="ko-display mt-4 text-xl font-bold text-slate-700">
            {t("learner.kpi.awaitingData")}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {t("learner.kpi.afterEnough")}
          </p>
        </>
      )}
    </article>
  );
}
