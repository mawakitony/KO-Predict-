import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  format,
  parseISO,
  startOfDay,
} from "date-fns";
import { FINAL_REVIEW_DAYS } from "@/lib/prediction/constants";
import { clamp, round1 } from "@/lib/prediction/math";
import type { PaceStatus } from "@/types/prediction";

export type PaceWindowDays = 7 | 14 | 30 | "all";

/**
 * Rythme actuel (activités / semaine).
 * V1 : utilise currentPace fourni. API prête pour fenêtres 7/14/30/all plus tard.
 */
export function calculateCurrentPace(options: {
  currentPace?: number | null;
  completedInWindow?: number | null;
  windowDays?: PaceWindowDays;
}): number | null {
  const { currentPace, completedInWindow, windowDays = 7 } = options;

  if (currentPace != null && Number.isFinite(currentPace) && currentPace >= 0) {
    return round1(currentPace);
  }

  if (
    completedInWindow == null ||
    !Number.isFinite(completedInWindow) ||
    completedInWindow < 0
  ) {
    return null;
  }

  if (windowDays === "all") {
    // Sans durée historique, impossible de dériver un rythme hebdo.
    return null;
  }

  const weeks = windowDays / 7;
  if (weeks <= 0) return null;
  return round1(completedInWindow / weeks);
}

/**
 * Rythme nécessaire = remaining / weeksRemaining jusqu'à la date cible.
 */
export function calculateRequiredPace(options: {
  remainingActivities: number | null;
  targetExamDate: string | null;
  asOf: Date;
}): number | null {
  const { remainingActivities, targetExamDate, asOf } = options;

  if (remainingActivities == null) return null;
  if (remainingActivities === 0) return 0;
  if (!targetExamDate) return null;

  const target = startOfDay(parseISO(targetExamDate));
  const today = startOfDay(asOf);
  const daysRemaining = differenceInCalendarDays(target, today);

  if (daysRemaining < 0) {
    // Date cible passée : rythme "nécessaire" non définissable de façon utile.
    return null;
  }

  if (daysRemaining === 0) {
    // Tout le reste doit être fait "aujourd'hui" → rythme hebdo très élevé.
    return round1(remainingActivities * 7);
  }

  const weeksRemaining = daysRemaining / 7;
  if (weeksRemaining <= 0) return null;

  return round1(remainingActivities / weeksRemaining);
}

export function calculatePredictedCompletionDate(options: {
  remainingActivities: number | null;
  currentPace: number | null;
  asOf: Date;
}): string | null {
  const { remainingActivities, currentPace, asOf } = options;

  if (remainingActivities == null) return null;
  if (remainingActivities === 0) {
    return format(startOfDay(asOf), "yyyy-MM-dd");
  }
  if (currentPace == null || currentPace <= 0) return null;

  const weeksNeeded = remainingActivities / currentPace;
  const completion = addWeeks(startOfDay(asOf), weeksNeeded);
  return format(completion, "yyyy-MM-dd");
}

export function calculatePredictedReadinessDate(
  predictedCompletionDate: string | null,
  finalReviewDays: number = FINAL_REVIEW_DAYS,
): string | null {
  if (!predictedCompletionDate) return null;
  const completion = parseISO(predictedCompletionDate);
  return format(addDays(completion, finalReviewDays), "yyyy-MM-dd");
}

export function calculatePaceScore(
  currentPace: number | null,
  requiredPace: number | null,
): number | null {
  if (currentPace == null || requiredPace == null) return null;
  if (requiredPace <= 0) {
    return currentPace >= 0 ? 100 : 0;
  }
  if (currentPace >= requiredPace) return 100;
  return clamp((currentPace / requiredPace) * 100, 0, 100);
}

export function calculatePaceStatus(
  currentPace: number | null,
  requiredPace: number | null,
): PaceStatus | null {
  if (currentPace == null) return null;
  if (currentPace === 0) return "NO_ACTIVITY";
  if (requiredPace == null) return null;
  if (requiredPace <= 0) return "ON_TRACK";

  const ratio = currentPace / requiredPace;

  if (ratio >= 1.1) return "AHEAD";
  if (ratio >= 0.95) return "ON_TRACK";
  if (ratio >= 0.75) return "SLIGHTLY_BEHIND";
  return "BEHIND";
}
