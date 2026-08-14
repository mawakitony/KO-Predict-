import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateInactiveDays } from "@/lib/learnworlds/aggregations";
import { calculatePrediction } from "@/lib/prediction/engine";
import {
  comparePredictionTrajectory,
  type TrajectoryDiff,
} from "@/lib/prediction/diff";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PredictionResult } from "@/types/prediction";

export interface RecalculateStudentResult {
  studentId: string;
  email: string | null;
  ok: boolean;
  error?: string;
  prediction?: PredictionResult;
  trajectory?: TrajectoryDiff;
  inactiveDays?: number;
}

export interface RecalculateAllResult {
  ok: true;
  processed: number;
  succeeded: number;
  failed: number;
  postponedCount: number;
  results: RecalculateStudentResult[];
  calculatedAt: string;
}

interface StudentRecalcRow {
  id: string;
  target_exam_date: string | null;
  profile_id: string;
}

/**
 * Recalcule un apprenant à partir des dernières métriques + rythme stocké.
 * Met à jour inactive_days, predictions et prediction_history.
 */
export async function recalculateStudentPrediction(
  studentId: string,
  db: SupabaseClient = createAdminClient(),
  asOf: Date = new Date(),
): Promise<RecalculateStudentResult> {
  const { data: student, error: studentError } = await db
    .from("students")
    .select("id, target_exam_date, profile_id")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError || !student) {
    return {
      studentId,
      email: null,
      ok: false,
      error: studentError?.message ?? "Étudiant introuvable.",
    };
  }

  const row = student as StudentRecalcRow;

  const { data: profile } = await db
    .from("profiles")
    .select("email")
    .eq("id", row.profile_id)
    .maybeSingle();
  const email = profile?.email ?? null;

  const { data: metrics } = await db
    .from("learning_metrics")
    .select(
      "id, progress_percent, completed_activities, total_activities, qcm_average, recent_qcm_average, last_activity_date, inactive_days",
    )
    .eq("student_id", studentId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!metrics) {
    return {
      studentId,
      email,
      ok: false,
      error: "Aucune métrique disponible.",
    };
  }

  const { data: previousPrediction } = await db
    .from("predictions")
    .select(
      "predicted_completion_date, predicted_readiness_date, current_pace, required_pace",
    )
    .eq("student_id", studentId)
    .maybeSingle();

  const inactiveDays = calculateInactiveDays(
    metrics.last_activity_date,
    asOf,
  );

  if (inactiveDays !== metrics.inactive_days) {
    await db
      .from("learning_metrics")
      .update({ inactive_days: inactiveDays })
      .eq("id", metrics.id);
  }

  const currentPace =
    previousPrediction?.current_pace == null
      ? metrics.completed_activities > 0
        ? 4
        : 0
      : Number(previousPrediction.current_pace);

  const prediction = calculatePrediction({
    completedActivities: metrics.completed_activities,
    totalActivities: Math.max(metrics.total_activities, 1),
    progressPercent:
      metrics.progress_percent == null
        ? null
        : Number(metrics.progress_percent),
    qcmAverage:
      metrics.qcm_average == null ? null : Number(metrics.qcm_average),
    recentQcmAverage:
      metrics.recent_qcm_average == null
        ? null
        : Number(metrics.recent_qcm_average),
    inactiveDays,
    targetExamDate: row.target_exam_date,
    currentPace,
    asOf,
  });

  const trajectory = comparePredictionTrajectory(
    previousPrediction
      ? {
          predictedCompletionDate:
            previousPrediction.predicted_completion_date,
          predictedReadinessDate: previousPrediction.predicted_readiness_date,
          currentPace:
            previousPrediction.current_pace == null
              ? null
              : Number(previousPrediction.current_pace),
          requiredPace:
            previousPrediction.required_pace == null
              ? null
              : Number(previousPrediction.required_pace),
        }
      : null,
    {
      predictedCompletionDate: prediction.predictedCompletionDate,
      predictedReadinessDate: prediction.predictedReadinessDate,
      currentPace: prediction.currentPace,
      requiredPace: prediction.requiredPace,
    },
  );

  const { error: upsertError } = await db.from("predictions").upsert(
    {
      student_id: studentId,
      current_pace: prediction.currentPace,
      required_pace: prediction.requiredPace,
      remaining_activities: prediction.remainingActivities,
      readiness_score: prediction.readinessScore,
      readiness_probability: prediction.readinessProbability,
      predicted_completion_date: prediction.predictedCompletionDate,
      predicted_readiness_date: prediction.predictedReadinessDate,
      risk_level: prediction.riskLevel,
      recommended_action: prediction.recommendedAction,
      pace_status: prediction.paceStatus,
      calculated_at: prediction.calculatedAt,
    },
    { onConflict: "student_id" },
  );

  if (upsertError) {
    return {
      studentId,
      email,
      ok: false,
      error: `Upsert prediction: ${upsertError.message}`,
      trajectory,
      inactiveDays,
    };
  }

  await db.from("prediction_history").insert({
    student_id: studentId,
    progress_percent: prediction.progressPercent,
    qcm_average:
      metrics.qcm_average == null ? null : Number(metrics.qcm_average),
    current_pace: prediction.currentPace,
    required_pace: prediction.requiredPace,
    readiness_score: prediction.readinessScore,
    readiness_probability: prediction.readinessProbability,
    predicted_completion_date: prediction.predictedCompletionDate,
    predicted_readiness_date: prediction.predictedReadinessDate,
    risk_level: prediction.riskLevel,
  });

  return {
    studentId,
    email,
    ok: true,
    prediction,
    trajectory,
    inactiveDays,
  };
}

/**
 * Recalcule tous les apprenants ayant au moins une métrique (actifs V1).
 */
export async function recalculateAllActiveStudents(
  options: { asOf?: Date; limit?: number } = {},
): Promise<RecalculateAllResult> {
  const db = createAdminClient();
  const asOf = options.asOf ?? new Date();
  const limit = options.limit ?? 500;

  const { data: metricStudentIds, error } = await db
    .from("learning_metrics")
    .select("student_id")
    .order("recorded_at", { ascending: false })
    .limit(2000);

  if (error) {
    throw new Error(`Liste métriques: ${error.message}`);
  }

  const uniqueIds = [
    ...new Set((metricStudentIds ?? []).map((r) => r.student_id as string)),
  ].slice(0, limit);

  const results: RecalculateStudentResult[] = [];
  for (const studentId of uniqueIds) {
    results.push(await recalculateStudentPrediction(studentId, db, asOf));
  }

  const succeeded = results.filter((r) => r.ok).length;
  const postponedCount = results.filter(
    (r) => r.ok && r.trajectory?.postponed,
  ).length;

  return {
    ok: true,
    processed: results.length,
    succeeded,
    failed: results.length - succeeded,
    postponedCount,
    results,
    calculatedAt: asOf.toISOString(),
  };
}
