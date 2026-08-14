import { clamp } from "@/lib/prediction/math";

/**
 * Progression en % (0–100).
 * Préfère progressPercent fourni s'il est valide ; sinon completed / total.
 */
export function calculateProgress(
  completedActivities: number,
  totalActivities: number,
  progressPercent?: number | null,
): number | null {
  if (
    progressPercent != null &&
    Number.isFinite(progressPercent) &&
    progressPercent >= 0 &&
    progressPercent <= 100
  ) {
    return clamp(progressPercent, 0, 100);
  }

  if (!Number.isFinite(totalActivities) || totalActivities <= 0) {
    return null;
  }

  if (!Number.isFinite(completedActivities) || completedActivities < 0) {
    return null;
  }

  return clamp((completedActivities / totalActivities) * 100, 0, 100);
}

export function calculateRemainingActivities(
  completedActivities: number,
  totalActivities: number,
): number | null {
  if (
    !Number.isFinite(completedActivities) ||
    !Number.isFinite(totalActivities) ||
    totalActivities < 0 ||
    completedActivities < 0
  ) {
    return null;
  }

  return Math.max(0, totalActivities - completedActivities);
}
