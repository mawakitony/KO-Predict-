/**
 * Work plan 7 jours — couche déterministe (Phase A).
 * WeeklyPlan = intention ; ce module = tâches + snapshot + progression + clôture.
 */

export type {
  MajorPlanEvent,
  WorkPlanBuildInput,
  WorkPlanDraft,
  WorkPlanMetricsNow,
  WorkPlanSnapshot,
  WorkPlanStatus,
  WorkPlanTask,
  WorkPlanTaskStatus,
  WorkPlanTaskType,
  WorkPlanType,
} from "@/lib/planning/work-plan/types";
export { MEASURABLE_TASK_TYPES } from "@/lib/planning/work-plan/types";

export {
  mapWeeklyStatusToPlanType,
  workPlanTypeLabelFr,
} from "@/lib/planning/work-plan/map-type";

export {
  activityProgressDelta,
  countMeasurableTasks,
  measurableTasksProgressLabel,
  refreshWorkPlanTasks,
  resolveActivitiesTaskStatus,
  resolveResumeActivityTaskStatus,
  resolveTargetDateTaskStatus,
} from "@/lib/planning/work-plan/progress";

export {
  detectMajorPlanEvents,
  shouldSupersedeForMajorEvents,
} from "@/lib/planning/work-plan/major-events";

export {
  allMeasurableTasksCompleted,
  resolveWorkPlanClosureStatus,
} from "@/lib/planning/work-plan/close";

export { buildWorkPlanTasks } from "@/lib/planning/work-plan/build-tasks";

export {
  WORK_PLAN_DURATION_DAYS,
  buildWorkPlanDraft,
  buildWorkPlanSnapshot,
  computeWorkPlanWindow,
} from "@/lib/planning/work-plan/build";

export {
  assertWorkPlanPayload,
  assertWorkPlanSnapshotOnly,
  assertWorkPlanTasksOnly,
  workPlanSnapshotSchema,
  workPlanTaskSchema,
  workPlanTasksSchema,
} from "@/lib/planning/work-plan/schema";

export { InMemoryWorkPlanStore } from "@/lib/planning/work-plan/memory-store";
export type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";

export {
  buildPreviousPlanRow,
  buildWorkPlanSummaryView,
  formatActivitiesProgress,
  formatWorkPlanPeriodFr,
  workPlanStatusLabelFr,
  workPlanTaskStatusLabelFr,
} from "@/lib/planning/work-plan/presentation";

// Persistance Supabase : importer depuis
// `@/lib/planning/work-plan/persistence` (server-only).
