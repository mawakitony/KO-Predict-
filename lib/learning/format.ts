import { translate } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/storage";

/**
 * Helpers présentation apprenant (progression pédagogique).
 */

export function formatSyncRelative(
  iso: string | null | undefined,
  locale: Locale = "fr",
): string {
  const label = translate(locale, "learner.lastSync");
  if (!iso) return translate(locale, "learner.lastSyncUnavailable");
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return translate(locale, "learner.lastSyncUnavailable");
  const diffMs = Date.now() - t;
  const ago = (() => {
    if (diffMs < 0) return translate(locale, "learner.justNow");
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return translate(locale, "learner.justNow");
    if (mins === 1) return translate(locale, "learner.agoMinute");
    if (mins < 60) return translate(locale, "learner.agoMinutes", { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours === 1) return translate(locale, "learner.agoHour");
    if (hours < 48) return translate(locale, "learner.agoHours", { n: hours });
    const days = Math.floor(hours / 24);
    if (days === 1) return translate(locale, "learner.agoDay");
    return translate(locale, "learner.agoDays", { n: days });
  })();
  return translate(locale, "learner.syncRelative", { label, ago });
}

export function formatSyncRelativeFr(iso: string | null | undefined): string {
  return formatSyncRelative(iso, "fr");
}

export function formatPercentOrDash(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Math.round(Number(value))} %`;
}
