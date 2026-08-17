"use client";

import type { RiskLevel } from "@/types/prediction";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { riskKey } from "@/lib/i18n/labels";

interface RiskCardProps {
  riskLevel: RiskLevel | null;
}

export function RiskCard({ riskLevel }: RiskCardProps) {
  const { t } = useLanguage();
  const title = t(riskKey(riskLevel));
  const detail =
    riskLevel == null
      ? t("learner.riskUnevaluatedDetail")
      : title;
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
        <p className="ko-dash-kpi-label">{t("admin.file.riskLevel")}</p>
        <span
          className={`ko-dash-badge ${
            tone === "up"
              ? "ko-dash-badge-up"
              : tone === "down"
                ? "ko-dash-badge-down"
                : "ko-dash-badge-warn"
          }`}
        >
          {title}
        </span>
      </div>
      <p className="ko-display mt-4 text-2xl font-black tracking-tight text-slate-900">
        {title}
      </p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </article>
  );
}
