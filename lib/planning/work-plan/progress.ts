import type {
  WorkPlanSnapshot,
  WorkPlanTask,
  WorkPlanTaskStatus,
} from "@/lib/planning/work-plan/types";
import { MEASURABLE_TASK_TYPES } from "@/lib/planning/work-plan/types";

/** Delta activités depuis le snapshot — jamais négatif à l’affichage. */
export function activityProgressDelta(
  completedActivitiesStart: number,
  completedActivitiesNow: number,
): number {
  const start = Number.isFinite(completedActivitiesStart)
    ? completedActivitiesStart
    : 0;
  const now = Number.isFinite(completedActivitiesNow)
    ? completedActivitiesNow
    : 0;
  return Math.max(0, now - start);
}

export function resolveActivitiesTaskStatus(
  progress: number,
  target: number | null,
): WorkPlanTaskStatus {
  if (target == null || !(target > 0)) {
    return progress > 0 ? "IN_PROGRESS" : "TODO";
  }
  if (progress >= target) return "COMPLETED";
  if (progress > 0) return "IN_PROGRESS";
  return "TODO";
}

export function resolveTargetDateTaskStatus(
  targetExamDateNow: string | null,
): WorkPlanTaskStatus {
  return targetExamDateNow != null && targetExamDateNow.trim() !== ""
    ? "COMPLETED"
    : "TODO";
}

/** Reprise = au moins une activité réelle depuis le snapshot. */
export function resolveResumeActivityTaskStatus(
  completedActivitiesStart: number,
  completedActivitiesNow: number,
): WorkPlanTaskStatus {
  return completedActivitiesNow > completedActivitiesStart
    ? "COMPLETED"
    : "TODO";
}

/**
 * Met à jour progress/status des tâches à partir des métriques courantes.
 * QCM_PRACTICE et MAINTAIN_PACE restent en guidance (pas COMPLETED auto V1).
 */
export function refreshWorkPlanTasks(
  tasks: WorkPlanTask[],
  snapshot: WorkPlanSnapshot,
  metrics: {
    completedActivities: number;
    targetExamDate: string | null;
  },
): WorkPlanTask[] {
  const delta = activityProgressDelta(
    snapshot.completedActivitiesStart,
    metrics.completedActivities,
  );

  return tasks.map((task) => {
    switch (task.type) {
      case "ACTIVITIES": {
        const target = task.target ?? snapshot.targetActivities;
        const status = resolveActivitiesTaskStatus(delta, target);
        return {
          ...task,
          target,
          progress: delta,
          status,
        };
      }
      case "TARGET_DATE":
        return {
          ...task,
          progress: null,
          status: resolveTargetDateTaskStatus(metrics.targetExamDate),
        };
      case "RESUME_ACTIVITY":
        return {
          ...task,
          progress: null,
          status: resolveResumeActivityTaskStatus(
            snapshot.completedActivitiesStart,
            metrics.completedActivities,
          ),
        };
      case "QCM_PRACTICE":
      case "MAINTAIN_PACE":
        // Guidance V1 : reste informative / IN_PROGRESS.
        return {
          ...task,
          progress: null,
          status:
            task.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
        };
      default:
        return task;
    }
  });
}

export function countMeasurableTasks(tasks: WorkPlanTask[]): {
  total: number;
  completed: number;
} {
  const measurable = tasks.filter(
    (t) => t.measurable && MEASURABLE_TASK_TYPES.has(t.type),
  );
  return {
    total: measurable.length,
    completed: measurable.filter((t) => t.status === "COMPLETED").length,
  };
}

/** Progression affichable « n tâches sur m » (mesurables uniquement). */
export function measurableTasksProgressLabel(tasks: WorkPlanTask[]): {
  completed: number;
  total: number;
} {
  return countMeasurableTasks(tasks);
}
