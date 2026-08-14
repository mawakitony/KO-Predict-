import type { PredictionResult } from "@/types/prediction";

/** IDs du seed Phase 4 (Tony Test). */
export const DEMO_STUDENT_ID = "a2222222-2222-4222-8222-222222222222";
export const DEMO_PROFILE_ID = "a1111111-1111-4111-8111-111111111111";

export interface DashboardStudentView {
  firstName: string;
  lastName: string;
  fullName: string;
  certification: string;
  targetExamDate: string | null;
  timezone: string | null;
  studentId: string;
}

export interface DashboardMetricsView {
  progressPercent: number | null;
  completedActivities: number;
  totalActivities: number;
  studyTimeMinutes: number;
  qcmAverage: number | null;
  recentQcmAverage: number | null;
  lastActivityDate: string | null;
  inactiveDays: number;
  recordedAt: string | null;
  currentPace: number | null;
}

export interface ReadinessHistoryPoint {
  readinessScore: number;
  createdAt: string;
}

export interface StudentDashboardData {
  student: DashboardStudentView;
  metrics: DashboardMetricsView;
  prediction: PredictionResult;
  trajectory: {
    headline: string | null;
    paceHint: string | null;
    postponed: boolean;
    advanced: boolean;
    readinessDaysDelta: number | null;
  } | null;
  /** Historique readiness existant (plus ancien → plus récent). */
  readinessHistory: ReadinessHistoryPoint[];
  dataSource: "demo" | "database";
}
