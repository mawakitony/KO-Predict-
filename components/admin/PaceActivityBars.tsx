"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

interface PaceActivityBarsProps {
  currentPace: number | null;
  requiredPace: number | null;
}

/** Barres d’activité comparant rythme actuel / nécessaire. */
export function PaceActivityBars({
  currentPace,
  requiredPace,
}: PaceActivityBarsProps) {
  const { t } = useLanguage();
  const days = [
    t("common.weekdayMon"),
    t("common.weekdayTue"),
    t("common.weekdayWed"),
    t("common.weekdayThu"),
    t("common.weekdayFri"),
    t("common.weekdaySat"),
    t("common.weekdaySun"),
  ];
  const max = Math.max(currentPace ?? 0, requiredPace ?? 0, 1);

  /** Répartition illustrative basée sur le rythme hebdo (pas de données journalières V1). */
  const currentHeights = days.map((_, i) => {
    if (currentPace == null || currentPace <= 0) return 12;
    const wave = 0.55 + 0.45 * Math.sin((i / 6) * Math.PI);
    return Math.max(14, (currentPace / max) * 100 * wave);
  });

  const requiredLine =
    requiredPace != null ? Math.min(100, (requiredPace / max) * 100) : null;

  return (
    <div className="relative flex h-36 items-end justify-between gap-2 px-1">
      {requiredLine != null ? (
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-[var(--admin-blue)]/50"
          style={{ bottom: `${requiredLine}%` }}
          title={t("admin.file.requiredPaceTitle", { pace: String(requiredPace) })}
        />
      ) : null}
      {days.map((day, i) => (
        <div key={day} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex h-28 w-full items-end justify-center">
            <div
              className="ko-pace-bar w-full max-w-[1.75rem] rounded-t-lg transition-all"
              style={{ height: `${currentHeights[i]}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-slate-400">{day}</span>
        </div>
      ))}
    </div>
  );
}
