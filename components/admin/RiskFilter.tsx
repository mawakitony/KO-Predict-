"use client";

import type { RiskLevel } from "@/types/prediction";

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
  return (
    <div className="ko-admin-filters">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Rechercher un apprenant…"
        className="ko-admin-filter-search"
      />
      <select
        value={certification}
        onChange={(e) => onCertificationChange(e.target.value)}
        className="ko-admin-filter-select"
      >
        <option value="ALL">Toutes certifications</option>
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
            {opt === "ALL" ? "Tous risques" : opt}
          </option>
        ))}
      </select>
    </div>
  );
}
