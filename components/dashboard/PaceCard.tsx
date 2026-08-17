"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

interface PaceCardProps {
  label: string;
  value: number | null;
  emptyMessage?: string;
}

export function PaceCard({
  label,
  value,
  emptyMessage,
}: PaceCardProps) {
  const { t } = useLanguage();
  return (
    <article className="ko-dash-kpi">
      <p className="ko-dash-kpi-label">{label}</p>
      {value != null ? (
        <>
          <p className="ko-display mt-4 text-3xl font-black tracking-tight text-slate-900">
            {value}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {t("learner.kpi.activitiesWeek")}
          </p>
        </>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-slate-500">
          {emptyMessage ?? t("learner.kpi.paceEmpty")}
        </p>
      )}
    </article>
  );
}
