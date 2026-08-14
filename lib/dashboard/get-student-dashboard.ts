import "server-only";

import { calculateInactiveDays } from "@/lib/learnworlds/aggregations";
import { calculatePrediction } from "@/lib/prediction/engine";
import { comparePredictionTrajectory } from "@/lib/prediction/diff";
import { createClient } from "@/lib/supabase/server";
import {
  DEMO_STUDENT_ID,
  type DashboardMetricsView,
  type DashboardStudentView,
  type StudentDashboardData,
} from "@/lib/dashboard/types";

export {
  DEMO_STUDENT_ID,
  type DashboardMetricsView,
  type DashboardStudentView,
  type StudentDashboardData,
} from "@/lib/dashboard/types";

export class DashboardDataError extends Error {
  constructor(
    message: string,
    readonly code: "NO_STUDENT" | "NO_METRICS" | "UNAUTHORIZED",
  ) {
    super(message);
    this.name = "DashboardDataError";
  }
}

/**
 * Charge le dashboard de l'utilisateur authentifié (RLS).
 */
export async function getStudentDashboardData(): Promise<StudentDashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new DashboardDataError("Non authentifié.", "UNAUTHORIZED");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: studentRow, error: studentError } = await supabase
    .from("students")
    .select("id, certification, target_exam_date, timezone, profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (studentError || !studentRow) {
    throw new DashboardDataError(
      "Aucun profil apprenant associé à ce compte.",
      "NO_STUDENT",
    );
  }

  const { data: metricsRow } = await supabase
    .from("learning_metrics")
    .select(
      "progress_percent, completed_activities, total_activities, study_time_minutes, qcm_average, recent_qcm_average, last_activity_date, inactive_days, recorded_at",
    )
    .eq("student_id", studentRow.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!metricsRow) {
    throw new DashboardDataError(
      "Aucune métrique d'apprentissage disponible.",
      "NO_METRICS",
    );
  }

  const { data: storedPrediction } = await supabase
    .from("predictions")
    .select("current_pace, required_pace")
    .eq("student_id", studentRow.id)
    .maybeSingle();

  const { data: historyRows } = await supabase
    .from("prediction_history")
    .select(
      "predicted_completion_date, predicted_readiness_date, readiness_score, created_at",
    )
    .eq("student_id", studentRow.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const firstName = profile?.first_name ?? "Apprenant";
  const lastName = profile?.last_name ?? "";

  const inactiveDays = calculateInactiveDays(metricsRow.last_activity_date);

  const currentPace =
    storedPrediction?.current_pace != null
      ? Number(storedPrediction.current_pace)
      : studentRow.id === DEMO_STUDENT_ID
        ? 5
        : 4;

  const metrics: DashboardMetricsView = {
    progressPercent: Number(metricsRow.progress_percent),
    completedActivities: metricsRow.completed_activities,
    totalActivities: metricsRow.total_activities,
    studyTimeMinutes: metricsRow.study_time_minutes,
    qcmAverage:
      metricsRow.qcm_average == null ? null : Number(metricsRow.qcm_average),
    recentQcmAverage:
      metricsRow.recent_qcm_average == null
        ? null
        : Number(metricsRow.recent_qcm_average),
    lastActivityDate: metricsRow.last_activity_date,
    inactiveDays,
    recordedAt: metricsRow.recorded_at,
    currentPace,
  };

  const student: DashboardStudentView = {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    certification: studentRow.certification,
    targetExamDate: studentRow.target_exam_date,
    timezone: studentRow.timezone,
    studentId: studentRow.id,
  };

  const prediction = calculatePrediction({
    completedActivities: metrics.completedActivities,
    totalActivities: metrics.totalActivities,
    progressPercent: metrics.progressPercent,
    qcmAverage: metrics.qcmAverage,
    recentQcmAverage: metrics.recentQcmAverage,
    inactiveDays: metrics.inactiveDays,
    targetExamDate: student.targetExamDate,
    currentPace: metrics.currentPace,
  });

  const previousHistory =
    historyRows && historyRows.length >= 2 ? historyRows[1] : null;

  const trajectoryDiff = comparePredictionTrajectory(
    previousHistory
      ? {
          predictedCompletionDate: previousHistory.predicted_completion_date,
          predictedReadinessDate: previousHistory.predicted_readiness_date,
        }
      : null,
    {
      predictedCompletionDate: prediction.predictedCompletionDate,
      predictedReadinessDate: prediction.predictedReadinessDate,
      currentPace: prediction.currentPace,
      requiredPace: prediction.requiredPace,
    },
  );

  const trajectory =
    trajectoryDiff.headline != null
      ? {
          headline: trajectoryDiff.headline,
          paceHint: trajectoryDiff.paceHint,
          postponed: trajectoryDiff.postponed,
          advanced: trajectoryDiff.advanced,
          readinessDaysDelta: trajectoryDiff.readinessDaysDelta,
        }
      : null;

  const readinessHistory = (historyRows ?? [])
    .slice()
    .reverse()
    .filter((row) => row.readiness_score != null)
    .map((row) => ({
      readinessScore: Number(row.readiness_score),
      createdAt: row.created_at as string,
    }));

  // Inclut le score courant s’il n’est pas déjà le dernier point historique
  if (prediction.readinessScore != null) {
    const last = readinessHistory[readinessHistory.length - 1];
    if (!last || last.readinessScore !== prediction.readinessScore) {
      readinessHistory.push({
        readinessScore: prediction.readinessScore,
        createdAt: prediction.calculatedAt,
      });
    }
  }

  return {
    student,
    metrics,
    prediction,
    trajectory,
    readinessHistory,
    dataSource: "database",
  };
}
