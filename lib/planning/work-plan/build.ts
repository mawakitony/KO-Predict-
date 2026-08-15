import {
  buildWeeklyPlan,
  type WeeklyPlan,
  type WeeklyPlanInput,
} from "@/lib/planning/weekly-plan";
import { buildWorkPlanTasks } from "@/lib/planning/work-plan/build-tasks";
import { mapWeeklyStatusToPlanType } from "@/lib/planning/work-plan/map-type";
import { refreshWorkPlanTasks } from "@/lib/planning/work-plan/progress";
import type {
  WorkPlanBuildInput,
  WorkPlanDraft,
  WorkPlanSnapshot,
} from "@/lib/planning/work-plan/types";

export const WORK_PLAN_DURATION_DAYS = 7 as const;

export function buildWorkPlanSnapshot(
  input: WorkPlanBuildInput,
  weekly: WeeklyPlan,
): WorkPlanSnapshot {
  return {
    completedActivitiesStart: Math.max(0, input.completedActivities),
    readinessStart: input.readinessScore,
    paceStatusStart: input.paceStatus,
    inactiveDaysStart: input.inactiveDays,
    targetExamDateStart: input.targetExamDate,
    requiredPaceStart: input.requiredPace,
    // COMPLETE : pas d’objectif artificiel d’activités restantes.
    targetActivities:
      weekly.status === "COMPLETE" ? null : weekly.targetActivities,
    qcmAverageStart: input.qcmAverage,
    weeklyStatusStart: weekly.status,
    primaryObjective: primaryObjectiveFor(
      mapWeeklyStatusToPlanType(weekly.status),
      weekly,
    ),
    reason: weekly.reason,
  };
}

function primaryObjectiveFor(
  planType: WorkPlanDraft["planType"],
  weekly: WeeklyPlan,
): string {
  switch (planType) {
    case "STARTUP":
      return "Construire les premières données nécessaires à votre trajectoire.";
    case "CATCH_UP":
      return weekly.primaryAction;
    case "CONSOLIDATION":
      return weekly.status === "COMPLETE"
        ? "Concentrez-vous sur la révision finale."
        : "Maintenir votre trajectoire actuelle.";
    default:
      return weekly.primaryAction;
  }
}

/**
 * Construit un brouillon de plan 7 jours.
 * WeeklyPlan reste la source du type et de targetActivities.
 */
export function buildWorkPlanDraft(input: WorkPlanBuildInput): WorkPlanDraft {
  const weeklyInput: WeeklyPlanInput = {
    readinessScore: input.readinessScore,
    currentPace: input.currentPace,
    requiredPace: input.requiredPace,
    paceStatus: input.paceStatus,
    remainingActivities: input.remainingActivities,
    inactiveDays: input.inactiveDays,
    qcmAverage: input.qcmAverage,
    riskLevel: input.riskLevel,
    issues: input.issues,
  };
  const weekly = buildWeeklyPlan(weeklyInput);
  const planType = mapWeeklyStatusToPlanType(weekly.status);
  const snapshot = buildWorkPlanSnapshot(input, weekly);
  let tasks = buildWorkPlanTasks({ planType, weekly, input, snapshot });
  tasks = refreshWorkPlanTasks(tasks, snapshot, {
    completedActivities: input.completedActivities,
    targetExamDate: input.targetExamDate,
  });

  return {
    planType,
    primaryObjective: primaryObjectiveFor(planType, weekly),
    reason: weekly.reason,
    weeklyStatus: weekly.status,
    snapshot,
    tasks,
    durationDays: WORK_PLAN_DURATION_DAYS,
  };
}

export function computeWorkPlanWindow(
  startsAt: Date,
  durationDays: number = WORK_PLAN_DURATION_DAYS,
): { startsAt: Date; endsAt: Date } {
  const endsAt = new Date(startsAt.getTime());
  endsAt.setUTCDate(endsAt.getUTCDate() + durationDays);
  return { startsAt, endsAt };
}
