"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export function PredictionHistoryNote({ hasHistory }: { hasHistory: boolean }) {
  const { t } = useLanguage();
  if (hasHistory) return null;

  return (
    <section className="ko-history-note" aria-label={t("learner.kpi.historyAria")}>
      <span className="ko-history-icon" aria-hidden>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15v-3M12 15V9M16 15v-5" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800">
          {t("learner.kpi.historySoon")}
        </p>
        <p className="mt-0.5 text-sm text-slate-500">
          {t("learner.kpi.historySoonBody")}
        </p>
      </div>
    </section>
  );
}
