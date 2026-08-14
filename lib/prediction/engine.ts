import { FINAL_REVIEW_DAYS } from "@/lib/prediction/constants";
import { calculateProgress, calculateRemainingActivities } from "@/lib/prediction/progress";
import {
  calculateCurrentPace,
  calculatePaceStatus,
  calculatePredictedCompletionDate,
  calculatePredictedReadinessDate,
  calculateRequiredPace,
} from "@/lib/prediction/pace";
import { calculateReadinessScore } from "@/lib/prediction/readiness";
import { calculateReadinessProbability } from "@/lib/prediction/probability";
import { calculateRiskLevel } from "@/lib/prediction/risk";
import { generateRecommendedAction } from "@/lib/prediction/recommendations";
import type {
  PredictionDataIssue,
  PredictionInput,
  PredictionResult,
} from "@/types/prediction";

export {
  calculateProgress,
  calculateRemainingActivities,
} from "@/lib/prediction/progress";
export {
  calculateCurrentPace,
  calculateRequiredPace,
  calculatePredictedCompletionDate,
  calculatePredictedReadinessDate,
  calculatePaceStatus,
  calculatePaceScore,
} from "@/lib/prediction/pace";
export {
  calculateReadinessScore,
  calculateConsistencyScore,
  calculateQcmScore,
} from "@/lib/prediction/readiness";
export { calculateReadinessProbability } from "@/lib/prediction/probability";
export { calculateRiskLevel } from "@/lib/prediction/risk";
export { generateRecommendedAction } from "@/lib/prediction/recommendations";
export { FINAL_REVIEW_DAYS } from "@/lib/prediction/constants";

/**
 * Point d'entrée du moteur KO Predict™ V1.
 * Règles déterministes uniquement — aucune IA.
 */
export function calculatePrediction(input: PredictionInput): PredictionResult {
  const asOf = input.asOf ?? new Date();
  const finalReviewDays = input.finalReviewDays ?? FINAL_REVIEW_DAYS;
  const issues: PredictionDataIssue[] = [];

  const progressPercent = calculateProgress(
    input.completedActivities,
    input.totalActivities,
    input.progressPercent,
  );

  const remainingActivities = calculateRemainingActivities(
    input.completedActivities,
    input.totalActivities,
  );

  if (remainingActivities === 0) {
    issues.push("NO_REMAINING_WORK");
  }

  if (!input.targetExamDate) {
    issues.push("MISSING_TARGET_DATE");
  }

  if (input.qcmAverage == null && input.recentQcmAverage == null) {
    issues.push("INSUFFICIENT_QCM");
  }

  const currentPace = calculateCurrentPace({
    currentPace: input.currentPace,
  });

  if (currentPace == null) {
    issues.push("INSUFFICIENT_ACTIVITY_FOR_PACE");
  } else if (currentPace === 0) {
    issues.push("ZERO_CURRENT_PACE");
  }

  const requiredPace = calculateRequiredPace({
    remainingActivities,
    targetExamDate: input.targetExamDate,
    asOf,
  });

  if (
    input.targetExamDate &&
    requiredPace == null &&
    remainingActivities != null &&
    remainingActivities > 0
  ) {
    // Date cible passée (ou non calculable) alors qu'il reste du travail.
    issues.push("TARGET_DATE_PASSED");
  }

  const predictedCompletionDate = calculatePredictedCompletionDate({
    remainingActivities,
    currentPace,
    asOf,
  });

  const predictedReadinessDate = calculatePredictedReadinessDate(
    predictedCompletionDate,
    finalReviewDays,
  );

  const readinessScore = calculateReadinessScore({
    progressPercent,
    qcmAverage: input.qcmAverage,
    recentQcmAverage: input.recentQcmAverage,
    inactiveDays: input.inactiveDays,
    currentPace,
    requiredPace,
  });

  const readinessProbability = calculateReadinessProbability({
    readinessScore,
    currentPace,
    requiredPace,
    targetExamDate: input.targetExamDate,
    predictedReadinessDate,
    inactiveDays: input.inactiveDays,
    qcmAverage: input.qcmAverage,
    asOf,
  });

  const riskLevel = calculateRiskLevel({
    readinessProbability,
    inactiveDays: input.inactiveDays,
    qcmAverage: input.qcmAverage,
    recentQcmAverage: input.recentQcmAverage,
    progressPercent,
  });

  const paceStatus = calculatePaceStatus(currentPace, requiredPace);

  const recommendedAction = generateRecommendedAction({
    riskLevel,
    paceStatus,
    requiredPace,
    currentPace,
    remainingActivities,
    issues,
  });

  return {
    progressPercent,
    remainingActivities,
    currentPace,
    requiredPace,
    readinessScore,
    readinessProbability,
    predictedCompletionDate,
    predictedReadinessDate,
    riskLevel,
    paceStatus,
    recommendedAction,
    issues,
    calculatedAt: asOf.toISOString(),
  };
}
