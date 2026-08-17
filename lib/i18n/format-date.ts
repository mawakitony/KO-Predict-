import { translate } from "@/lib/i18n/translate";
import { LOCALE_BCP47, type Locale } from "@/lib/i18n/storage";

function parseDisplayDate(value: string): Date | null {
  const datePart = value.trim().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const next = new Date(year, month - 1, day);
    if (
      next.getFullYear() !== year ||
      next.getMonth() !== month - 1 ||
      next.getDate() !== day
    ) {
      return null;
    }
    const timePart = value.trim().slice(10);
    if (timePart) {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? next : parsed;
    }
    return next;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDate(
  value: string | null | undefined,
  locale: Locale,
): string {
  if (!value) return translate(locale, "date.unavailable");
  const date = parseDisplayDate(value);
  if (!date) return translate(locale, "date.unavailable");
  return new Intl.DateTimeFormat(LOCALE_BCP47[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(
  value: string | null | undefined,
  locale: Locale,
): string {
  if (!value) return translate(locale, "date.empty");
  const date = parseDisplayDate(value);
  if (!date) return translate(locale, "date.empty");
  return new Intl.DateTimeFormat(LOCALE_BCP47[locale], {
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatDateTime(
  value: string | null | undefined,
  locale: Locale,
): string {
  if (!value) return translate(locale, "date.empty");
  const date = parseDisplayDate(value);
  if (!date) return translate(locale, "date.empty");
  const dateLabel = new Intl.DateTimeFormat(LOCALE_BCP47[locale], {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat(LOCALE_BCP47[locale], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return translate(locale, "date.dateTime", {
    date: dateLabel,
    time: timeLabel,
  });
}
