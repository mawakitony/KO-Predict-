import { differenceInCalendarDays, parseISO } from "date-fns";
import { round1 } from "@/lib/prediction/math";

export interface PredictionDateSnapshot {
  predictedCompletionDate: string | null;
  predictedReadinessDate: string | null;
  currentPace?: number | null;
  requiredPace?: number | null;
}

export interface TrajectoryDiff {
  previousReadinessDate: string | null;
  currentReadinessDate: string | null;
  previousCompletionDate: string | null;
  currentCompletionDate: string | null;
  /** Jours de décalage de la date de préparation (positif = repoussée). */
  readinessDaysDelta: number | null;
  completionDaysDelta: number | null;
  postponed: boolean;
  advanced: boolean;
  /** Message principal (date repoussée / avancée). */
  headline: string | null;
  /** Message rythme pour rattraper. */
  paceHint: string | null;
}

function daysBetween(
  previous: string | null,
  current: string | null,
): number | null {
  if (!previous || !current) return null;
  try {
    return differenceInCalendarDays(parseISO(current), parseISO(previous));
  } catch {
    return null;
  }
}

function formatDayCount(days: number): string {
  return Math.abs(days) === 1 ? "1 jour" : `${Math.abs(days)} jours`;
}

/**
 * Compare deux prédictions pour détecter une date de préparation repoussée.
 * Cas CDC : 20 sept → 27 sept = « repoussée de 7 jours ».
 */
export function comparePredictionTrajectory(
  previous: PredictionDateSnapshot | null,
  current: PredictionDateSnapshot,
): TrajectoryDiff {
  const previousReadinessDate = previous?.predictedReadinessDate ?? null;
  const currentReadinessDate = current.predictedReadinessDate ?? null;
  const previousCompletionDate = previous?.predictedCompletionDate ?? null;
  const currentCompletionDate = current.predictedCompletionDate ?? null;

  const readinessDaysDelta = daysBetween(
    previousReadinessDate,
    currentReadinessDate,
  );
  const completionDaysDelta = daysBetween(
    previousCompletionDate,
    currentCompletionDate,
  );

  const postponed = (readinessDaysDelta ?? 0) > 0;
  const advanced = (readinessDaysDelta ?? 0) < 0;

  let headline: string | null = null;
  if (readinessDaysDelta != null && readinessDaysDelta > 0) {
    headline = `Votre date prévue de préparation a été repoussée de ${formatDayCount(readinessDaysDelta)}.`;
  } else if (readinessDaysDelta != null && readinessDaysDelta < 0) {
    headline = `Votre date prévue de préparation a été avancée de ${formatDayCount(readinessDaysDelta)}.`;
  }

  let paceHint: string | null = null;
  const currentPace = current.currentPace;
  const requiredPace = current.requiredPace;
  if (
    postponed &&
    currentPace != null &&
    requiredPace != null &&
    requiredPace > currentPace
  ) {
    paceHint = `Votre rythme actuel est de ${round1(currentPace)} activités par semaine. Pour revenir sur votre trajectoire, vous devez atteindre ${round1(requiredPace)} activités par semaine.`;
  }

  return {
    previousReadinessDate,
    currentReadinessDate,
    previousCompletionDate,
    currentCompletionDate,
    readinessDaysDelta,
    completionDaysDelta,
    postponed,
    advanced,
    headline,
    paceHint,
  };
}
