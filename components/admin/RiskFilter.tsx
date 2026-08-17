"use client";

import type { RiskLevel } from "@/types/prediction";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { riskKey } from "@/lib/i18n/labels";

const RISK_OPTIONS: Array<RiskLevel | "ALL"> = [
  "ALL",
  "CRITICAL",
  "RED",
  "AMBER",
  "GREEN",
];

interface RiskFilterProps {
  value: RiskLevel | "ALL";
  onChange: (value: RiskLevel | "ALL") => void;
  certifications: string[];
  certification: string;
  onCertificationChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

export function RiskFilter({
  value,
  onChange,
  certifications,
  certification,
  onCertificationChange,
  search,
  onSearchChange,
}: RiskFilterProps) {
  const { t } = useLanguage();
  return (
    <div className="ko-admin-filters">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={t("admin.learners.searchPlaceholder")}
        className="ko-admin-filter-search"
      />
      <select
        value={certification}
        onChange={(e) => onCertificationChange(e.target.value)}
        className="ko-admin-filter-select"
      >
        <option value="ALL">{t("admin.learners.allCerts")}</option>
        {certifications.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as RiskLevel | "ALL")}
        className="ko-admin-filter-select"
      >
        {RISK_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "ALL" ? t("risk.all") : t(riskKey(opt))}
          </option>
        ))}
      </select>
    </div>
  );
}
