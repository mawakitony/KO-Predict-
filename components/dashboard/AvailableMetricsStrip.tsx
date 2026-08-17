"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { buildAvailableMetrics } from "@/lib/dashboard/available-metrics";
import { formatStudyHours } from "@/lib/dashboard/cockpit-copy";

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
  const { t, locale } = useLanguage();
  const items = buildAvailableMetrics(props);

  function labelFor(key: string): string {
    switch (key) {
      case "progress":
        return t("admin.file.progress");
      case "activities":
        return t("admin.file.activities");
      case "study":
        return t("admin.file.studyTime");
      case "qcm":
        return t("admin.file.qcmAverage");
      case "inactive":
        return t("admin.file.lastActivity");
      default:
        return key;
    }
  }

  function valueFor(key: string, fallback: string): string {
    if (key === "study") {
      return props.studyTimeMinutes > 0
        ? formatStudyHours(props.studyTimeMinutes, locale)
        : t("admin.file.studyTimeMin", { minutes: 0 });
    }
    if (key === "inactive") {
      if (props.inactiveDays <= 0) return t("learner.collection.today");
      if (props.inactiveDays === 1) return t("learner.agoDay");
      return t("learner.agoDays", { n: props.inactiveDays });
    }
    return fallback;
  }

  return (
    <section
      aria-label={t("learner.collection.available")}
      className="ko-collect-metrics"
    >
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {t("learner.collection.available")}
      </p>
      <ul className="ko-collect-metrics-grid">
        {items.map((item) => (
          <li key={item.key} className="ko-collect-metric">
            <p className="ko-collect-metric-label">{labelFor(item.key)}</p>
            <p className="ko-collect-metric-value">
              {valueFor(item.key, item.value)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
