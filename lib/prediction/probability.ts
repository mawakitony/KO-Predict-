import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import { clamp, round0 } from "@/lib/prediction/math";

/**
 * Probabilité d'être prêt à temps — Estimation KO Predict™ V1 (déterministe).
 *
 * Formule documentée :
 *   base = readinessScore
 *   + bonus/malus rythme : clamp((currentPace / requiredPace - 1) * 20, -25, +15)
 *   + bonus/malus calendrier : si predictedReadinessDate et targetExamDate
 *       écart jours = target - readiness
 *       si écart >= 0 : +min(10, écart)
 *       si écart < 0  : -min(30, |écart| * 1.5)
 *   + malus inactivité : si inactiveDays >= 3 : -(inactiveDays - 2) * 3
 *   + ajustement QCM : (qcmScore - 70) * 0.15
 *
 * Résultat clampé entre 0 et 100.
 * Ce n'est PAS une garantie de réussite à l'examen.
 */
export function calculateReadinessProbability(options: {
  readinessScore: number | null;
  currentPace: number | null;
  requiredPace: number | null;
  targetExamDate: string | null;
  predictedReadinessDate: string | null;
  inactiveDays: number;
  qcmAverage: number | null;
  asOf: Date;
}): number | null {
  const {
    readinessScore,
    currentPace,
    requiredPace,
    targetExamDate,
    predictedReadinessDate,
    inactiveDays,
    qcmAverage,
    asOf,
  } = options;

  if (readinessScore == null) return null;

  let probability = readinessScore;

  if (
    currentPace != null &&
    requiredPace != null &&
    requiredPace > 0 &&
    Number.isFinite(currentPace)
  ) {
    const paceDelta = (currentPace / requiredPace - 1) * 20;
    probability += clamp(paceDelta, -25, 15);
  } else if (currentPace === 0) {
    probability -= 20;
  }

  if (targetExamDate && predictedReadinessDate) {
    const target = startOfDay(parseISO(targetExamDate));
    const readiness = startOfDay(parseISO(predictedReadinessDate));
    const gapDays = differenceInCalendarDays(target, readiness);

    if (gapDays >= 0) {
      probability += Math.min(10, gapDays);
    } else {
      probability -= Math.min(30, Math.abs(gapDays) * 1.5);
    }
  } else if (targetExamDate) {
    const target = startOfDay(parseISO(targetExamDate));
    const today = startOfDay(asOf);
    if (differenceInCalendarDays(target, today) < 0) {
      probability -= 25;
    }
  }

  if (inactiveDays >= 3) {
    probability -= (inactiveDays - 2) * 3;
  }

  if (qcmAverage != null) {
    probability += (qcmAverage - 70) * 0.15;
  }

  return round0(clamp(probability, 0, 100));
}
