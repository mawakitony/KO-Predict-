import "server-only";

import { calculatePrediction } from "@/lib/prediction/engine";
import { DEMO_STUDENT_ID } from "@/lib/dashboard/types";
import type { DashboardMetricsView, DashboardStudentView } from "@/lib/dashboard/types";
import {
  RISK_SORT_ORDER,
  type AdminStudentDetail,
  type AdminStudentRow,
} from "@/lib/admin/types";
import type { PredictionHistory, PredictionResult, RiskLevel } from "@/types/prediction";

export type { AdminStudentDetail, AdminStudentRow } from "@/lib/admin/types";
export { RISK_SORT_ORDER } from "@/lib/admin/types";

interface DemoSeed {
  student: DashboardStudentView;
  metrics: DashboardMetricsView;
  history: Array<{
    progressPercent: number;
    qcmAverage: number;
    currentPace: number;
    requiredPace: number;
    readinessScore: number;
    readinessProbability: number;
    predictedCompletionDate: string;
    predictedReadinessDate: string;
    riskLevel: RiskLevel;
    createdAt: string;
  }>;
}

const DEMO_SEEDS: DemoSeed[] = [
  {
    student: {
      firstName: "Tony",
      lastName: "Test",
      fullName: "Tony Test",
      certification: "PMP",
      targetExamDate: "2026-09-25",
      timezone: "Europe/Paris",
      studentId: DEMO_STUDENT_ID,
    },
    metrics: {
      progressPercent: 62,
      completedActivities: 62,
      totalActivities: 100,
      studyTimeMinutes: 720,
      qcmAverage: 78,
      recentQcmAverage: 81,
      lastActivityDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      inactiveDays: 1,
      recordedAt: new Date().toISOString(),
      currentPace: 5,
    },
    history: [
      {
        progressPercent: 42,
        qcmAverage: 70,
        currentPace: 3.5,
        requiredPace: 8,
        readinessScore: 42,
        readinessProbability: 48,
        predictedCompletionDate: "2026-10-05",
        predictedReadinessDate: "2026-10-12",
        riskLevel: "RED",
        createdAt: "2026-08-01T10:00:00.000Z",
      },
      {
        progressPercent: 51,
        qcmAverage: 74,
        currentPace: 4,
        requiredPace: 7.5,
        readinessScore: 51,
        readinessProbability: 58,
        predictedCompletionDate: "2026-09-28",
        predictedReadinessDate: "2026-10-05",
        riskLevel: "RED",
        createdAt: "2026-08-05T10:00:00.000Z",
      },
      {
        progressPercent: 58,
        qcmAverage: 76,
        currentPace: 4.5,
        requiredPace: 7.2,
        readinessScore: 60,
        readinessProbability: 66,
        predictedCompletionDate: "2026-09-22",
        predictedReadinessDate: "2026-09-29",
        riskLevel: "AMBER",
        createdAt: "2026-08-10T10:00:00.000Z",
      },
    ],
  },
  {
    student: {
      firstName: "Amina",
      lastName: "Diallo",
      fullName: "Amina Diallo",
      certification: "PMP",
      targetExamDate: "2026-09-15",
      timezone: "Europe/Paris",
      studentId: "b3333333-3333-4333-8333-333333333333",
    },
    metrics: {
      progressPercent: 38,
      completedActivities: 38,
      totalActivities: 100,
      studyTimeMinutes: 410,
      qcmAverage: 62,
      recentQcmAverage: 58,
      lastActivityDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      inactiveDays: 8,
      recordedAt: new Date().toISOString(),
      currentPace: 1.5,
    },
    history: [
      {
        progressPercent: 30,
        qcmAverage: 65,
        currentPace: 2,
        requiredPace: 9,
        readinessScore: 38,
        readinessProbability: 35,
        predictedCompletionDate: "2026-10-20",
        predictedReadinessDate: "2026-10-27",
        riskLevel: "RED",
        createdAt: "2026-08-01T10:00:00.000Z",
      },
      {
        progressPercent: 35,
        qcmAverage: 63,
        currentPace: 1.8,
        requiredPace: 9.5,
        readinessScore: 34,
        readinessProbability: 30,
        predictedCompletionDate: "2026-10-25",
        predictedReadinessDate: "2026-11-01",
        riskLevel: "CRITICAL",
        createdAt: "2026-08-08T10:00:00.000Z",
      },
    ],
  },
  {
    student: {
      firstName: "Julien",
      lastName: "Martin",
      fullName: "Julien Martin",
      certification: "CAPM",
      targetExamDate: "2026-10-30",
      timezone: "Europe/Paris",
      studentId: "c4444444-4444-4444-8444-444444444444",
    },
    metrics: {
      progressPercent: 78,
      completedActivities: 78,
      totalActivities: 100,
      studyTimeMinutes: 980,
      qcmAverage: 88,
      recentQcmAverage: 90,
      lastActivityDate: new Date().toISOString(),
      inactiveDays: 0,
      recordedAt: new Date().toISOString(),
      currentPace: 8,
    },
    history: [
      {
        progressPercent: 60,
        qcmAverage: 84,
        currentPace: 6,
        requiredPace: 5,
        readinessScore: 72,
        readinessProbability: 78,
        predictedCompletionDate: "2026-10-10",
        predictedReadinessDate: "2026-10-17",
        riskLevel: "AMBER",
        createdAt: "2026-08-01T10:00:00.000Z",
      },
      {
        progressPercent: 72,
        qcmAverage: 87,
        currentPace: 7.5,
        requiredPace: 4.5,
        readinessScore: 84,
        readinessProbability: 88,
        predictedCompletionDate: "2026-10-05",
        predictedReadinessDate: "2026-10-12",
        riskLevel: "GREEN",
        createdAt: "2026-08-08T10:00:00.000Z",
      },
    ],
  },
];

function toRow(seed: DemoSeed): AdminStudentRow {
  const prediction = calculatePrediction({
    completedActivities: seed.metrics.completedActivities,
    totalActivities: seed.metrics.totalActivities,
    progressPercent: seed.metrics.progressPercent,
    qcmAverage: seed.metrics.qcmAverage,
    recentQcmAverage: seed.metrics.recentQcmAverage,
    inactiveDays: seed.metrics.inactiveDays,
    targetExamDate: seed.student.targetExamDate,
    currentPace: seed.metrics.currentPace,
  });

  return {
    student: seed.student,
    metrics: seed.metrics,
    prediction,
  };
}

function toHistory(seed: DemoSeed): PredictionHistory[] {
  return seed.history.map((h, index) => ({
    id: `${seed.student.studentId}-hist-${index}`,
    studentId: seed.student.studentId,
    progressPercent: h.progressPercent,
    qcmAverage: h.qcmAverage,
    currentPace: h.currentPace,
    requiredPace: h.requiredPace,
    readinessScore: h.readinessScore,
    readinessProbability: h.readinessProbability,
    predictedCompletionDate: h.predictedCompletionDate,
    predictedReadinessDate: h.predictedReadinessDate,
    riskLevel: h.riskLevel,
    createdAt: h.createdAt,
  }));
}

export function getDemoAdminRows(): AdminStudentRow[] {
  return DEMO_SEEDS.map(toRow).sort((a, b) => {
    const ra = a.prediction.riskLevel
      ? RISK_SORT_ORDER[a.prediction.riskLevel]
      : 99;
    const rb = b.prediction.riskLevel
      ? RISK_SORT_ORDER[b.prediction.riskLevel]
      : 99;
    return ra - rb;
  });
}

export function getDemoStudentDetail(id: string): AdminStudentDetail | null {
  const seed = DEMO_SEEDS.find((s) => s.student.studentId === id);
  if (!seed) return null;
  const row = toRow(seed);
  return {
    ...row,
    history: toHistory(seed),
    dataSource: "demo",
    email: `${seed.student.firstName.toLowerCase()}.${seed.student.lastName.toLowerCase()}@demo.kopredict.dev`,
  };
}

export function getInterventionQueue(rows: AdminStudentRow[]): AdminStudentRow[] {
  return rows
    .filter(
      (r) =>
        r.prediction.riskLevel === "CRITICAL" ||
        r.prediction.riskLevel === "RED" ||
        r.prediction.riskLevel === "AMBER",
    )
    .sort((a, b) => {
      const ra = a.prediction.riskLevel
        ? RISK_SORT_ORDER[a.prediction.riskLevel]
        : 99;
      const rb = b.prediction.riskLevel
        ? RISK_SORT_ORDER[b.prediction.riskLevel]
        : 99;
      return ra - rb;
    });
}

export async function getAdminDashboardData(): Promise<{
  rows: AdminStudentRow[];
  interventions: AdminStudentRow[];
  interventionCards: import("@/lib/admin/interventions/types").CoachInterventionCard[];
  certifications: string[];
  dataSource: "demo" | "database";
}> {
  const { ensureAndLoadInterventionCards } = await import(
    "@/lib/admin/interventions/service"
  );

  const fromDb = await loadAdminRowsFromDatabase();
  if (fromDb.length > 0) {
    const interventionCards = await ensureAndLoadInterventionCards(
      fromDb,
      "database",
    );
    return {
      rows: fromDb,
      interventions: getInterventionQueue(fromDb),
      interventionCards,
      certifications: [
        ...new Set(fromDb.map((r) => r.student.certification)),
      ].sort(),
      dataSource: "database",
    };
  }

  const rows = getDemoAdminRows();
  const interventionCards = await ensureAndLoadInterventionCards(rows, "demo");
  return {
    rows,
    interventions: getInterventionQueue(rows),
    interventionCards,
    certifications: [...new Set(rows.map((r) => r.student.certification))].sort(),
    dataSource: "demo",
  };
}

/** Tendance école depuis prediction_history (agrégation journalière). */
export async function getSchoolTrendSeries(): Promise<
  import("@/lib/admin/school-overview").SchoolTrendPoint[]
> {
  const { aggregateSchoolTrends } = await import("@/lib/admin/school-overview");

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("prediction_history")
      .select(
        "created_at, readiness_score, readiness_probability, progress_percent",
      )
      .order("created_at", { ascending: true })
      .limit(800);

    if (!error && data && data.length > 0) {
      return aggregateSchoolTrends(
        data.map((h) => ({
          createdAt: h.created_at,
          readinessScore:
            h.readiness_score == null ? null : Number(h.readiness_score),
          readinessProbability:
            h.readiness_probability == null
              ? null
              : Number(h.readiness_probability),
          progressPercent:
            h.progress_percent == null ? null : Number(h.progress_percent),
        })),
      );
    }
  } catch {
    /* fallback démo */
  }

  // Démo : moyennes journalières des seeds
  const demoPoints = DEMO_SEEDS.flatMap((seed) =>
    seed.history.map((h) => ({
      createdAt: h.createdAt,
      readinessScore: h.readinessScore,
      readinessProbability: h.readinessProbability,
      progressPercent: h.progressPercent,
    })),
  );
  return aggregateSchoolTrends(demoPoints);
}

/**
 * Charge la fiche admin par `public.students.id`.
 * Appelle notFound côté page si null (student inconnu / hors démo).
 */
export async function getAdminStudentDetail(
  id: string,
): Promise<AdminStudentDetail | null> {
  const fromDb = await loadAdminStudentDetailFromDatabase(id);
  if (fromDb) return fromDb;

  // Fallback démo uniquement pour les IDs seed (Tony / Amina / Julien)
  return getDemoStudentDetail(id);
}

async function loadAdminRowsFromDatabase(): Promise<AdminStudentRow[]> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: students, error } = await supabase
      .from("students")
      .select(
        "id, certification, target_exam_date, timezone, profile_id, profiles(first_name, last_name, email, account_status)",
      )
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error || !students?.length) return [];

    const rows: AdminStudentRow[] = [];
    for (const s of students) {
      const row = await buildAdminRowFromStudent(supabase, s);
      if (row) rows.push(row);
    }
    return rows.sort((a, b) => {
      const ra = a.prediction.riskLevel
        ? RISK_SORT_ORDER[a.prediction.riskLevel]
        : 99;
      const rb = b.prediction.riskLevel
        ? RISK_SORT_ORDER[b.prediction.riskLevel]
        : 99;
      return ra - rb;
    });
  } catch {
    return [];
  }
}

async function loadAdminStudentDetailFromDatabase(
  id: string,
): Promise<AdminStudentDetail | null> {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: student, error } = await supabase
      .from("students")
      .select(
        "id, certification, target_exam_date, timezone, profile_id, profiles(first_name, last_name, email, account_status)",
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !student) return null;

    const row = await buildAdminRowFromStudent(supabase, student);
    if (!row) return null;

    const { data: historyRows } = await supabase
      .from("prediction_history")
      .select(
        "id, student_id, progress_percent, qcm_average, current_pace, required_pace, readiness_score, readiness_probability, predicted_completion_date, predicted_readiness_date, risk_level, created_at",
      )
      .eq("student_id", id)
      .order("created_at", { ascending: true })
      .limit(50);

    const history: PredictionHistory[] = (historyRows ?? []).map((h) => ({
      id: h.id,
      studentId: h.student_id,
      progressPercent:
        h.progress_percent == null ? null : Number(h.progress_percent),
      qcmAverage: h.qcm_average == null ? null : Number(h.qcm_average),
      currentPace: h.current_pace == null ? null : Number(h.current_pace),
      requiredPace: h.required_pace == null ? null : Number(h.required_pace),
      readinessScore:
        h.readiness_score == null ? null : Number(h.readiness_score),
      readinessProbability:
        h.readiness_probability == null
          ? null
          : Number(h.readiness_probability),
      predictedCompletionDate: h.predicted_completion_date,
      predictedReadinessDate: h.predicted_readiness_date,
      riskLevel: h.risk_level as PredictionHistory["riskLevel"],
      createdAt: h.created_at,
    }));

    const profileRaw = student.profiles;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;

    return {
      ...row,
      history,
      dataSource: "database",
      email: profile?.email ?? null,
    };
  } catch {
    return null;
  }
}

type StudentJoinRow = {
  id: string;
  certification: string;
  target_exam_date: string | null;
  timezone: string | null;
  profile_id: string;
  profiles:
    | {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        account_status?: string | null;
      }
    | {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        account_status?: string | null;
      }[]
    | null;
};

async function buildAdminRowFromStudent(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  s: StudentJoinRow,
): Promise<AdminStudentRow | null> {
  const profile = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles;
  const firstName = profile?.first_name ?? "Apprenant";
  const lastName = profile?.last_name ?? "";

  const { data: metricsRow } = await supabase
    .from("learning_metrics")
    .select(
      "progress_percent, completed_activities, total_activities, study_time_minutes, qcm_average, recent_qcm_average, last_activity_date, inactive_days, recorded_at",
    )
    .eq("student_id", s.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: predRow } = await supabase
    .from("predictions")
    .select(
      "current_pace, required_pace, remaining_activities, readiness_score, readiness_probability, predicted_completion_date, predicted_readiness_date, risk_level, recommended_action, pace_status, calculated_at",
    )
    .eq("student_id", s.id)
    .maybeSingle();

  const metrics: DashboardMetricsView = {
    progressPercent:
      metricsRow?.progress_percent == null
        ? null
        : Number(metricsRow.progress_percent),
    completedActivities: metricsRow?.completed_activities ?? 0,
    totalActivities: metricsRow?.total_activities ?? 0,
    studyTimeMinutes: metricsRow?.study_time_minutes ?? 0,
    qcmAverage:
      metricsRow?.qcm_average == null ? null : Number(metricsRow.qcm_average),
    recentQcmAverage:
      metricsRow?.recent_qcm_average == null
        ? null
        : Number(metricsRow.recent_qcm_average),
    lastActivityDate: metricsRow?.last_activity_date ?? null,
    inactiveDays: metricsRow?.inactive_days ?? 0,
    recordedAt: metricsRow?.recorded_at ?? null,
    currentPace:
      predRow?.current_pace == null ? null : Number(predRow.current_pace),
  };

  const prediction =
    predRow != null
      ? {
          progressPercent: metrics.progressPercent,
          remainingActivities: predRow.remaining_activities,
          currentPace:
            predRow.current_pace == null ? null : Number(predRow.current_pace),
          requiredPace:
            predRow.required_pace == null
              ? null
              : Number(predRow.required_pace),
          readinessScore:
            predRow.readiness_score == null
              ? null
              : Number(predRow.readiness_score),
          readinessProbability:
            predRow.readiness_probability == null
              ? null
              : Number(predRow.readiness_probability),
          predictedCompletionDate: predRow.predicted_completion_date,
          predictedReadinessDate: predRow.predicted_readiness_date,
          riskLevel: predRow.risk_level as PredictionResult["riskLevel"],
          paceStatus: predRow.pace_status as PredictionResult["paceStatus"],
          recommendedAction: predRow.recommended_action,
          issues: [],
          calculatedAt: predRow.calculated_at,
        }
      : calculatePrediction({
          completedActivities: metrics.completedActivities,
          totalActivities: Math.max(metrics.totalActivities, 1),
          progressPercent: metrics.progressPercent,
          qcmAverage: metrics.qcmAverage,
          recentQcmAverage: metrics.recentQcmAverage,
          inactiveDays: metrics.inactiveDays,
          targetExamDate: s.target_exam_date,
          currentPace: metrics.currentPace ?? 4,
        });

  return {
    student: {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
      certification: s.certification,
      targetExamDate: s.target_exam_date,
      timezone: s.timezone,
      studentId: s.id,
    },
    metrics,
    prediction,
    accountStatus:
      profile?.account_status === "DISABLED"
        ? "DISABLED"
        : profile?.account_status === "PENDING_ACTIVATION"
          ? "PENDING_ACTIVATION"
          : "ACTIVE",
  };
}
