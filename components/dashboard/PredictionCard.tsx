"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDateShort } from "@/lib/i18n/format-date";

interface PredictionCardProps {
  label: string;
  date: string | null;
  emptyMessage?: string;
}

export function PredictionCard({
  label,
  date,
  emptyMessage,
}: PredictionCardProps) {
  const { t, locale } = useLanguage();
  return (
    <article className="ko-dash-kpi">
      <p className="ko-dash-kpi-label">{label}</p>
      <p className="ko-display mt-4 text-2xl font-black tracking-tight text-slate-900">
        {date ? formatDateShort(date, locale) : emptyMessage ?? t("date.unavailable")}
      </p>
    </article>
  );
}
