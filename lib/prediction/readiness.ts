import { READINESS_WEIGHTS } from "@/lib/prediction/constants";
import { clamp, round0 } from "@/lib/prediction/math";
import { calculatePaceScore } from "@/lib/prediction/pace";

/**
 * Score de régularité V1 basé principalement sur inactive_days.
 */
export function calculateConsistencyScore(inactiveDays: number): number {
  if (!Number.isFinite(inactiveDays) || inactiveDays < 0) {
    return 0;
  }

  if (inactiveDays <= 1) return 100;
  if (inactiveDays === 2) return 90;
  if (inactiveDays === 3) return 80;
  if (inactiveDays === 4) return 70;
  if (inactiveDays === 5) return 60;
  if (inactiveDays === 6) return 50;
  if (inactiveDays === 7) return 40;

  // Au-delà de 7 jours : diminution progressive, minimum 0.
  return clamp(40 - (inactiveDays - 7) * 5, 0, 100);
}

export function calculateQcmScore(
  qcmAverage: number | null,
  recentQcmAverage?: number | null,
): number | null {
  if (qcmAverage == null && recentQcmAverage == null) return null;

  if (qcmAverage != null && recentQcmAverage != null) {
    // Léger biais vers le récent si disponible.
    return clamp(qcmAverage * 0.6 + recentQcmAverage * 0.4, 0, 100);
  }

  return clamp((qcmAverage ?? recentQcmAverage) as number, 0, 100);
}

/**
 * Readiness Score V1 — estimation interne KO Predict™ (non scientifique).
 * 30% progression + 30% QCM + 20% régularité + 20% rythme.
 */
export function calculateReadinessScore(options: {
  progressPercent: number | null;
  qcmAverage: number | null;
  recentQcmAverage?: number | null;
  inactiveDays: number;
  currentPace: number | null;
  requiredPace: number | null;
}): number | null {
  const {
    progressPercent,
    qcmAverage,
    recentQcmAverage,
    inactiveDays,
    currentPace,
    requiredPace,
  } = options;

  const progressScore =
    progressPercent == null ? null : clamp(progressPercent, 0, 100);
  const qcmScore = calculateQcmScore(qcmAverage, recentQcmAverage);
  const consistencyScore = calculateConsistencyScore(inactiveDays);
  const paceScore = calculatePaceScore(currentPace, requiredPace);

  // Si QCM ou progression manquent, on ne invente pas un score trompeur.
  if (progressScore == null || qcmScore == null) {
    return null;
  }

  // Si le rythme n'est pas calculable, redistribuer son poids sur progress+qcm+consistency.
  if (paceScore == null) {
    const weightSum =
      READINESS_WEIGHTS.progress +
      READINESS_WEIGHTS.qcm +
      READINESS_WEIGHTS.consistency;
    const score =
      (progressScore * READINESS_WEIGHTS.progress +
        qcmScore * READINESS_WEIGHTS.qcm +
        consistencyScore * READINESS_WEIGHTS.consistency) /
      weightSum;
    return round0(clamp(score, 0, 100));
  }

  const score =
    progressScore * READINESS_WEIGHTS.progress +
    qcmScore * READINESS_WEIGHTS.qcm +
    consistencyScore * READINESS_WEIGHTS.consistency +
    paceScore * READINESS_WEIGHTS.pace;

  return round0(clamp(score, 0, 100));
}
