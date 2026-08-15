import type { SyncLearnerResult } from "@/lib/learnworlds/sync";
import type { WorkPlanBuildInput } from "@/lib/planning/work-plan/types";
import type { PredictionResult } from "@/types/prediction";

/**
 * Construit l’entrée plan uniquement depuis le résultat de sync
 * (metrics + prediction déjà calculés) — aucun appel LW.
 */
export function workPlanInputFromSyncResult(
  result: Pick<SyncLearnerResult, "metrics" | "prediction" | "targetExamDate">,
): WorkPlanBuildInput {
  return workPlanInputFromPredictionAndMetrics({
    prediction: result.prediction,
    completedActivities: result.metrics.completedActivities,
    inactiveDays: result.metrics.inactiveDays,
    qcmAverage: result.metrics.qcmAverage,
    targetExamDate: result.targetExamDate,
  });
}

export function workPlanInputFromPredictionAndMetrics(options: {
  prediction: PredictionResult;
  completedActivities: number;
  inactiveDays: number;
  qcmAverage: number | null;
  targetExamDate: string | null;
}): WorkPlanBuildInput {
  const { prediction } = options;
  return {
    completedActivities: Math.max(0, options.completedActivities),
    readinessScore: prediction.readinessScore,
    paceStatus: prediction.paceStatus,
    inactiveDays: options.inactiveDays,
    targetExamDate: options.targetExamDate,
    requiredPace: prediction.requiredPace,
    remainingActivities: prediction.remainingActivities,
    qcmAverage: options.qcmAverage,
    currentPace: prediction.currentPace,
    issues: prediction.issues ?? [],
    riskLevel: prediction.riskLevel,
  };
}
