import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type {
  PaceStatus,
  PredictionDataIssue,
  RiskLevel,
} from "@/types/prediction";
import { predictionIssueKey, riskKey } from "@/lib/i18n/labels";
import { translate } from "@/lib/i18n/translate";
import type { Locale } from "@/lib/i18n/storage";

function paceShort(value: number, locale: Locale): string {
  const n = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return translate(locale, "learner.activitiesPerWeek", { n });
}

/** Libellés risque pour l’apprenant (pas RED/AMBER/GREEN bruts). */
export function cockpitRiskLabel(
  level: RiskLevel | null,
  locale: Locale = "fr",
): string {
  if (level == null) return translate(locale, "learner.riskUnevaluated");
  return translate(locale, riskKey(level));
}

export type CockpitRiskTone = "good" | "warn" | "danger" | "neutral";

export function cockpitRiskTone(level: RiskLevel | null): CockpitRiskTone {
  switch (level) {
    case "GREEN":
      return "good";
    case "AMBER":
      return "warn";
    case "RED":
    case "CRITICAL":
      return "danger";
    default:
      return "neutral";
  }
}

/** Phrase sous le score — dérivée du statut de rythme existant. */
export function cockpitHeroNarrative(
  input: {
    paceStatus: PaceStatus | null;
    currentPace: number | null;
    requiredPace: number | null;
    readinessScore: number | null;
  },
  locale: Locale = "fr",
): string {
  const { paceStatus, currentPace, requiredPace, readinessScore } = input;

  if (readinessScore == null) {
    return translate(locale, "learner.heroUnavailable");
  }

  switch (paceStatus) {
    case "ON_TRACK":
      return translate(locale, "learner.heroOnTrack");
    case "AHEAD":
      return translate(locale, "learner.heroAhead");
    case "SLIGHTLY_BEHIND":
      if (currentPace != null && requiredPace != null) {
        return translate(locale, "learner.heroSlight", {
          current: paceShort(currentPace, locale),
          required: paceShort(requiredPace, locale),
        });
      }
      return translate(locale, "learner.heroSlightNoNums");
    case "BEHIND":
      if (currentPace != null && requiredPace != null) {
        return translate(locale, "learner.heroBehind", {
          current: paceShort(currentPace, locale),
          required: paceShort(requiredPace, locale),
        });
      }
      return translate(locale, "learner.heroBehindNoNums");
    case "NO_ACTIVITY":
      return translate(locale, "learner.heroNoActivity");
    default:
      return translate(locale, "learner.heroDefault");
  }
}

/** « Pourquoi ? » sous la priorité — uniquement données déjà disponibles. */
export function cockpitPriorityWhy(
  input: {
    paceHint: string | null;
    currentPace: number | null;
    requiredPace: number | null;
    issues: PredictionDataIssue[];
  },
  locale: Locale = "fr",
): string | null {
  if (input.paceHint?.trim()) return input.paceHint.trim();

  if (
    input.currentPace != null &&
    input.requiredPace != null &&
    input.requiredPace > input.currentPace
  ) {
    const current = Number.isInteger(input.currentPace)
      ? String(input.currentPace)
      : input.currentPace.toFixed(1);
    const required = Number.isInteger(input.requiredPace)
      ? String(input.requiredPace)
      : input.requiredPace.toFixed(1);
    return translate(locale, "learner.whyPaceGap", { current, required });
  }

  const firstIssue = input.issues[0];
  if (firstIssue) {
    return translate(locale, predictionIssueKey(firstIssue));
  }

  return null;
}

export function cockpitDaysUntil(
  targetDate: string | null,
  asOf: Date = new Date(),
): number | null {
  if (!targetDate) return null;
  try {
    return differenceInCalendarDays(
      startOfDay(parseISO(targetDate)),
      startOfDay(asOf),
    );
  } catch {
    return null;
  }
}

/**
 * Interprétation calendrier : readiness estimée vs date cible.
 * Utilise uniquement les dates déjà calculées par le moteur.
 */
export function cockpitCountdownInterpretation(
  input: {
    targetExamDate: string | null;
    predictedReadinessDate: string | null;
  },
  locale: Locale = "fr",
): string | null {
  const { targetExamDate, predictedReadinessDate } = input;
  if (!targetExamDate) return null;
  if (!predictedReadinessDate) {
    return translate(locale, "learner.readyDateUnavailable");
  }

  try {
    const target = startOfDay(parseISO(targetExamDate));
    const ready = startOfDay(parseISO(predictedReadinessDate));
    const gap = differenceInCalendarDays(ready, target);

    if (gap > 0) {
      const label =
        gap === 1
          ? translate(locale, "learner.dayOne")
          : translate(locale, "learner.dayMany", { n: gap });
      return translate(locale, "learner.countdownAfter", { label });
    }
    if (gap < 0) {
      const ahead = Math.abs(gap);
      const label =
        ahead === 1
          ? translate(locale, "learner.dayOne")
          : translate(locale, "learner.dayMany", { n: ahead });
      return translate(locale, "learner.countdownBefore", { label });
    }
    return translate(locale, "learner.countdownOk");
  } catch {
    return null;
  }
}

/** Pistes d’amélioration selon les issues présentes uniquement. */
export function cockpitEstimationTips(
  issues: PredictionDataIssue[],
  locale: Locale = "fr",
): string[] {
  const tips: string[] = [];
  const set = new Set(issues);

  if (
    set.has("ZERO_CURRENT_PACE") ||
    set.has("INSUFFICIENT_ACTIVITY_FOR_PACE") ||
    set.has("INCOMPLETE_METRICS")
  ) {
    tips.push(translate(locale, "learner.tipProgress"));
  }
  if (set.has("INSUFFICIENT_QCM")) {
    tips.push(translate(locale, "learner.tipQcm"));
  }
  if (set.has("MISSING_TARGET_DATE") || set.has("TARGET_DATE_PASSED")) {
    tips.push(translate(locale, "learner.tipDate"));
  }

  return tips;
}

export function formatStudyHours(
  minutes: number,
  locale: Locale = "fr",
): string {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return translate(locale, "admin.file.studyTimeMin", { minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
