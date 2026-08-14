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
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <input
        type="search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Rechercher un apprenant…"
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-[var(--admin-blue)] focus:bg-white focus:ring-2 focus:ring-[var(--admin-blue-ring)]"
      />
      <select
        value={certification}
        onChange={(e) => onCertificationChange(e.target.value)}
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
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
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
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
