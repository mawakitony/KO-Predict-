import { formatDate, formatDateShort, formatDateTime } from "@/lib/i18n/format-date";
import { paceKey, riskKey } from "@/lib/i18n/labels";
import { translate } from "@/lib/i18n/translate";
import type { PaceStatus, RiskLevel } from "@/types/prediction";

export function formatDateFr(date: string | null | undefined): string {
  return formatDate(date, "fr");
}

export function formatDateShortFr(date: string | null | undefined): string {
  return formatDateShort(date, "fr");
}

export function formatDateTimeFr(iso: string | null | undefined): string {
  return formatDateTime(iso, "fr");
}

export function formatPercent(
  value: number | null | undefined,
  locale: import("@/lib/i18n/storage").Locale = "fr",
): string {
  if (value == null || Number.isNaN(value)) {
    return translate(locale, "date.unavailable");
  }
  return `${Math.round(value)} %`;
}

export function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Math.round(value)}`;
}

export function formatPace(
  value: number | null | undefined,
  locale: import("@/lib/i18n/storage").Locale = "fr",
): string {
  if (value == null || Number.isNaN(value)) {
    return translate(locale, "learner.issue.zeroPace");
  }
  return translate(locale, "learner.activitiesPerWeek", { n: value });
}

export function riskLabel(
  level: RiskLevel | null,
  locale: import("@/lib/i18n/storage").Locale = "fr",
): string {
  if (level == null) return translate(locale, "risk.unevaluated");
  return translate(locale, riskKey(level));
}

export function paceStatusLabel(
  status: PaceStatus | null,
  locale: import("@/lib/i18n/storage").Locale = "fr",
): string {
  return translate(locale, paceKey(status));
}

export function riskToneClasses(level: RiskLevel | null): {
  bg: string;
  text: string;
  border: string;
  badge: string;
} {
  switch (level) {
    case "GREEN":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-800",
        border: "border-emerald-200",
        badge: "bg-emerald-600 text-white",
      };
    case "AMBER":
      return {
        bg: "bg-amber-50",
        text: "text-amber-900",
        border: "border-amber-200",
        badge: "bg-amber-500 text-white",
      };
    case "RED":
      return {
        bg: "bg-red-50",
        text: "text-red-800",
        border: "border-red-200",
        badge: "bg-red-600 text-white",
      };
    case "CRITICAL":
      return {
        bg: "bg-red-950/10",
        text: "text-red-950",
        border: "border-red-900/30",
        badge: "bg-red-950 text-white",
      };
    default:
      return {
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
        badge: "bg-slate-600 text-white",
      };
  }
}
