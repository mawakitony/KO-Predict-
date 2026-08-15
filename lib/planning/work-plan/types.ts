import type { PaceStatus } from "@/types/prediction";
import type { WeeklyPlanStatus } from "@/lib/planning/weekly-plan";

/** Types produit (UI FR : « Mon plan de progression »). */
export type WorkPlanType = "STARTUP" | "CATCH_UP" | "CONSOLIDATION";

export type WorkPlanStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "PARTIAL"
  | "EXPIRED"
  | "SUPERSEDED";

export type WorkPlanTaskType =
  | "ACTIVITIES"
  | "TARGET_DATE"
  | "RESUME_ACTIVITY"
  | "QCM_PRACTICE"
  | "MAINTAIN_PACE";

export type WorkPlanTaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NOT_APPLICABLE";

/** Tâches prises en compte pour COMPLETED / PARTIAL / EXPIRED. */
export const MEASURABLE_TASK_TYPES: ReadonlySet<WorkPlanTaskType> = new Set([
  "ACTIVITIES",
  "TARGET_DATE",
  "RESUME_ACTIVITY",
]);

export type MajorPlanEvent =
  | "TARGET_DATE_BECAME_AVAILABLE"
  | "TARGET_DATE_REMOVED"
  | "FIRST_RELIABLE_TRAJECTORY"
  | "LEARNING_COMPLETED";

export interface WorkPlanSnapshot {
  completedActivitiesStart: number;
  readinessStart: number | null;
  paceStatusStart: PaceStatus | null;
  inactiveDaysStart: number | null;
  targetExamDateStart: string | null;
  requiredPaceStart: number | null;
  targetActivities: number | null;
  qcmAverageStart: number | null;
  /** Persistance : intention WeeklyPlan au démarrage du cycle. */
  weeklyStatusStart: WeeklyPlanStatus;
  primaryObjective: string;
  reason: string;
}

export interface WorkPlanTask {
  id: string;
  type: WorkPlanTaskType;
  title: string;
  description: string;
  /** Objectif chiffré si mesurable (ex. activités). */
  target: number | null;
  /** Progression chiffrée (ex. delta activités), null si guidance. */
  progress: number | null;
  status: WorkPlanTaskStatus;
  reason: string;
  /** true = entre dans le calcul de clôture du plan. */
  measurable: boolean;
}

/** Brouillon déterministe avant persistance (Phase B). */
export interface WorkPlanDraft {
  planType: WorkPlanType;
  primaryObjective: string;
  reason: string;
  weeklyStatus: WeeklyPlanStatus;
  snapshot: WorkPlanSnapshot;
  tasks: WorkPlanTask[];
  /** Durée fixe V1. */
  durationDays: 7;
}

export interface WorkPlanMetricsNow {
  completedActivities: number;
  readinessScore: number | null;
  paceStatus: PaceStatus | null;
  inactiveDays: number | null;
  targetExamDate: string | null;
  requiredPace: number | null;
  remainingActivities: number | null;
  qcmAverage: number | null;
}

export interface WorkPlanBuildInput extends WorkPlanMetricsNow {
  currentPace: number | null;
  issues: import("@/types/prediction").PredictionDataIssue[];
  riskLevel: import("@/types/prediction").RiskLevel | null;
}
