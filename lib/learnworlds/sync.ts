import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { calculatePrediction } from "@/lib/prediction/engine";
import {
  aggregateCourseProgress,
  calculateInactiveDays,
  extractAssessmentScoresFromProgress,
  summarizeAssessmentScores,
} from "@/lib/learnworlds/aggregations";
import { createLearnWorldsClient } from "@/lib/learnworlds/client";
import { mapLearnWorldsUserToStudentFields } from "@/lib/learnworlds/mappers";
import {
  getUserCourseProgressList,
  listUserEnrollments,
} from "@/lib/learnworlds/progress";
import { getLearnWorldsUserById } from "@/lib/learnworlds/users";
import {
  metricsFingerprintsEqual,
  predictionFingerprintsEqual,
  type MetricsFingerprint,
  type PredictionFingerprint,
} from "@/lib/cron/sync-learnworlds-helpers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseAdminConfigured } from "@/lib/supabase/env";
import type { PredictionResult } from "@/types/prediction";

export interface SyncLearnerInput {
  learnworldsUserIdOrEmail: string;
  currentPace?: number | null;
  certificationFallback?: string;
}

export interface SyncLearnerResult {
  ok: true;
  studentId: string;
  learnworldsUserId: string;
  email: string | null;
  targetExamDate: string | null;
  changed: boolean;
  historyWritten: boolean;
  metrics: {
    progressPercent: number | null;
    completedActivities: number;
    totalActivities: number;
    studyTimeMinutes: number;
    inactiveDays: number;
    lastActivityDate: string | null;
    qcmAverage: number | null;
    recentQcmAverage: number | null;
    qcmScoresFound: number;
  };
  prediction: PredictionResult;
}

async function getDbClient(db?: SupabaseClient) {
  if (db) return db;
  if (isSupabaseAdminConfigured()) {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    return createAdminClient();
  }
  return createClient();
}

export async function syncLearnWorldsLearner(
  input: SyncLearnerInput,
  db?: SupabaseClient,
): Promise<SyncLearnerResult> {
  const lw = createLearnWorldsClient();
  const user = await getLearnWorldsUserById(input.learnworldsUserIdOrEmail, lw);
  const mapped = mapLearnWorldsUserToStudentFields(user);

  const [enrollments, progressList] = await Promise.all([
    listUserEnrollments(user.id, lw),
    getUserCourseProgressList(user.id, lw),
  ]);

  const aggregated = aggregateCourseProgress(progressList);
  const lastActivityDate = user.lastLoginAt;
  const inactiveDays = calculateInactiveDays(lastActivityDate);

  const assessmentScores = extractAssessmentScoresFromProgress(
    progressList,
    user.id,
  );
  const qcmSummary = summarizeAssessmentScores(assessmentScores);

  const completedActivities = Math.max(0, aggregated.completedActivities ?? 0);
  const totalActivities = Math.max(
    completedActivities,
    aggregated.totalActivities ?? completedActivities,
  );
  const progressPercent =
    aggregated.progressPercent ??
    (totalActivities > 0 ? (completedActivities / totalActivities) * 100 : null);

  const studyTimeMinutes = Math.round(aggregated.studyTimeMinutes ?? 0);

  const courseHint = (
    progressList[0]?.courseId ??
    enrollments[0]?.courseId ??
    ""
  ).toLowerCase();
  const tagsHint = JSON.stringify(user.raw ?? {}).toLowerCase();
  const inferredCertification =
    courseHint.includes("capm") || tagsHint.includes("capm")
      ? "CAPM"
      : courseHint.includes("pmp") || tagsHint.includes("pmp")
        ? "PMP"
        : courseHint
          ? courseHint.slice(0, 40)
          : "PMP";
  const certification = input.certificationFallback ?? inferredCertification;

  const enrollmentDate = enrollments
    .map((e) => e.enrolledAt)
    .filter((d): d is string => Boolean(d))
    .sort()[0];

  const supabase = await getDbClient(db);

  let studentId: string | null = null;
  let profileId: string | null = null;
  let previousQcm: number | null = null;
  let previousRecentQcm: number | null = null;
  let previousPace: number | null = null;
  let previousMetricsFp: MetricsFingerprint | null = null;
  let previousPredictionFp: PredictionFingerprint | null = null;

  const { data: byLw } = await supabase
    .from("students")
    .select("id, profile_id, target_exam_date")
    .eq("learnworlds_user_id", user.id)
    .maybeSingle();

  let existingTargetExamDate: string | null = null;

  if (byLw) {
    studentId = byLw.id;
    profileId = byLw.profile_id;
    existingTargetExamDate = byLw.target_exam_date ?? null;
  } else if (mapped.email) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", mapped.email)
      .maybeSingle();

    if (profile) {
      profileId = profile.id;
      const { data: byProfile } = await supabase
        .from("students")
        .select("id, target_exam_date")
        .eq("profile_id", profile.id)
        .maybeSingle();
      studentId = byProfile?.id ?? null;
      existingTargetExamDate = byProfile?.target_exam_date ?? null;
    }
  }

  if (!profileId) {
    throw new Error(
      `Aucun profil KO Predict™ trouvé pour ${mapped.email ?? user.id}. Créez d'abord le compte Auth / profile.`,
    );
  }

  if (studentId) {
    const { data: prevMetrics } = await supabase
      .from("learning_metrics")
      .select(
        "qcm_average, recent_qcm_average, progress_percent, completed_activities, total_activities, study_time_minutes",
      )
      .eq("student_id", studentId)
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    previousQcm =
      prevMetrics?.qcm_average == null ? null : Number(prevMetrics.qcm_average);
    previousRecentQcm =
      prevMetrics?.recent_qcm_average == null
        ? null
        : Number(prevMetrics.recent_qcm_average);
    if (prevMetrics) {
      previousMetricsFp = {
        progressPercent:
          prevMetrics.progress_percent == null
            ? null
            : Number(prevMetrics.progress_percent),
        completedActivities: Number(prevMetrics.completed_activities ?? 0),
        totalActivities: Number(prevMetrics.total_activities ?? 0),
        studyTimeMinutes: Number(prevMetrics.study_time_minutes ?? 0),
        qcmAverage: previousQcm,
        recentQcmAverage: previousRecentQcm,
      };
    }

    const { data: prevPrediction } = await supabase
      .from("predictions")
      .select(
        "current_pace, required_pace, readiness_score, readiness_probability, risk_level, predicted_completion_date, predicted_readiness_date",
      )
      .eq("student_id", studentId)
      .maybeSingle();
    previousPace =
      prevPrediction?.current_pace == null
        ? null
        : Number(prevPrediction.current_pace);
    if (prevPrediction) {
      previousPredictionFp = {
        readinessScore:
          prevPrediction.readiness_score == null
            ? null
            : Number(prevPrediction.readiness_score),
        readinessProbability:
          prevPrediction.readiness_probability == null
            ? null
            : Number(prevPrediction.readiness_probability),
        riskLevel: prevPrediction.risk_level ?? null,
        currentPace: previousPace,
        requiredPace:
          prevPrediction.required_pace == null
            ? null
            : Number(prevPrediction.required_pace),
        predictedCompletionDate:
          prevPrediction.predicted_completion_date ?? null,
        predictedReadinessDate:
          prevPrediction.predicted_readiness_date ?? null,
      };
    }
  }

  const studentPayload = {
    profile_id: profileId,
    learnworlds_user_id: user.id,
    certification,
    enrollment_date: enrollmentDate ? enrollmentDate.slice(0, 10) : null,
    timezone: "Europe/Paris",
    updated_at: new Date().toISOString(),
  };

  // Ne pas écraser une date cible déjà connue si LearnWorlds ne la renvoie pas.
  if (mapped.targetExamDate) {
    Object.assign(studentPayload, { target_exam_date: mapped.targetExamDate });
  }

  if (studentId) {
    const { error } = await supabase
      .from("students")
      .update(studentPayload)
      .eq("id", studentId);
    if (error) throw new Error(`Mise à jour student: ${error.message}`);
  } else {
    const { data: created, error } = await supabase
      .from("students")
      .insert({
        ...studentPayload,
        target_exam_date: mapped.targetExamDate,
      })
      .select("id")
      .single();
    if (error || !created) {
      throw new Error(`Création student: ${error?.message ?? "inconnu"}`);
    }
    studentId = created.id;
  }

  // Identité LearnWorlds : ne remplit first/last que s'ils sont vides.
  // Ne jamais toucher display_name / avatar_url (préférences KO Predict™).
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", profileId)
    .maybeSingle();

  await supabase
    .from("profiles")
    .update({
      first_name: existingProfile?.first_name || mapped.firstName,
      last_name: existingProfile?.last_name || mapped.lastName,
      email: mapped.email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  // QCM : scores unitaires assessmentV2 depuis /progress (confirmé live).
  // Si aucun score trouvé, conserver les valeurs précédentes (ne pas inventer).
  const resolvedQcm =
    qcmSummary.qcmAverage != null ? qcmSummary.qcmAverage : previousQcm;
  const resolvedRecentQcm =
    qcmSummary.recentQcmAverage != null
      ? qcmSummary.recentQcmAverage
      : previousRecentQcm;

  const { error: metricsError } = await supabase.from("learning_metrics").insert({
    student_id: studentId,
    progress_percent: progressPercent ?? 0,
    completed_activities: completedActivities,
    total_activities: Math.max(totalActivities, 1),
    study_time_minutes: studyTimeMinutes,
    qcm_average: resolvedQcm,
    recent_qcm_average: resolvedRecentQcm,
    last_activity_date: lastActivityDate,
    inactive_days: inactiveDays,
    recorded_at: new Date().toISOString(),
    source: "learnworlds",
  });

  if (metricsError) {
    throw new Error(`Insertion metrics: ${metricsError.message}`);
  }

  const resolvedTargetExamDate =
    mapped.targetExamDate ?? existingTargetExamDate;

  const currentPace =
    input.currentPace ?? previousPace ?? (completedActivities > 0 ? 4 : 0);

  const prediction = calculatePrediction({
    completedActivities,
    totalActivities: Math.max(totalActivities, 1),
    progressPercent,
    qcmAverage: resolvedQcm,
    recentQcmAverage: resolvedRecentQcm,
    inactiveDays,
    targetExamDate: resolvedTargetExamDate,
    currentPace,
  });

  const { error: predictionError } = await supabase.from("predictions").upsert(
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

  if (predictionError) {
    throw new Error(`Upsert prediction: ${predictionError.message}`);
  }

  const nextMetricsFp: MetricsFingerprint = {
    progressPercent,
    completedActivities,
    totalActivities: Math.max(totalActivities, 1),
    studyTimeMinutes,
    qcmAverage: resolvedQcm,
    recentQcmAverage: resolvedRecentQcm,
  };
  const nextPredictionFp: PredictionFingerprint = {
    readinessScore: prediction.readinessScore,
    readinessProbability: prediction.readinessProbability,
    riskLevel: prediction.riskLevel,
    currentPace: prediction.currentPace,
    requiredPace: prediction.requiredPace,
    predictedCompletionDate: prediction.predictedCompletionDate,
    predictedReadinessDate: prediction.predictedReadinessDate,
  };

  const metricsUnchanged =
    previousMetricsFp != null &&
    metricsFingerprintsEqual(previousMetricsFp, nextMetricsFp);
  const predictionUnchanged =
    previousPredictionFp != null &&
    predictionFingerprintsEqual(previousPredictionFp, nextPredictionFp);
  const changed = !(metricsUnchanged && predictionUnchanged);

  // Évite les snapshots history identiques à chaque cron/webhook.
  let historyWritten = false;
  if (!predictionUnchanged) {
    await supabase.from("prediction_history").insert({
      student_id: studentId,
      progress_percent: prediction.progressPercent,
      qcm_average: resolvedQcm,
      current_pace: prediction.currentPace,
      required_pace: prediction.requiredPace,
      readiness_score: prediction.readinessScore,
      readiness_probability: prediction.readinessProbability,
      predicted_completion_date: prediction.predictedCompletionDate,
      predicted_readiness_date: prediction.predictedReadinessDate,
      risk_level: prediction.riskLevel,
    });
    historyWritten = true;
  }

  if (!studentId) {
    throw new Error("Identifiant étudiant manquant après synchronisation.");
  }

  return {
    ok: true,
    studentId,
    learnworldsUserId: user.id,
    email: mapped.email,
    targetExamDate: resolvedTargetExamDate,
    changed,
    historyWritten,
    metrics: {
      progressPercent,
      completedActivities,
      totalActivities: Math.max(totalActivities, 1),
      studyTimeMinutes,
      inactiveDays,
      lastActivityDate,
      qcmAverage: resolvedQcm,
      recentQcmAverage: resolvedRecentQcm,
      qcmScoresFound: assessmentScores.length,
    },
    prediction,
  };
}
