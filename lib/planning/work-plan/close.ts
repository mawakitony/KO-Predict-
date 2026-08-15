import type { WorkPlanStatus, WorkPlanTask } from "@/lib/planning/work-plan/types";
import { countMeasurableTasks } from "@/lib/planning/work-plan/progress";

/**
 * Clôture V1 à expiration (ou si toutes les tâches mesurables sont faites) :
 * - toutes mesurables COMPLETED → COMPLETED
 * - au moins une progression mesurable (IN_PROGRESS ou COMPLETED partiel) → PARTIAL
 * - aucune progression mesurable → EXPIRED
 *
 * Les tâches de guidance (QCM, MAINTAIN_PACE) n’empêchent pas COMPLETED.
 */
export function resolveWorkPlanClosureStatus(tasks: WorkPlanTask[]): {
  status: Extract<WorkPlanStatus, "COMPLETED" | "PARTIAL" | "EXPIRED">;
  measurableTotal: number;
  measurableCompleted: number;
  measurableStarted: number;
} {
  const measurable = tasks.filter((t) => t.measurable);
  const { total, completed } = countMeasurableTasks(tasks);
  const started = measurable.filter(
    (t) => t.status === "IN_PROGRESS" || t.status === "COMPLETED",
  ).length;

  if (total === 0) {
    // Uniquement guidance : à l’expiration → EXPIRED (rien à « réussir »).
    return {
      status: "EXPIRED",
      measurableTotal: 0,
      measurableCompleted: 0,
      measurableStarted: 0,
    };
  }

  if (completed >= total) {
    return {
      status: "COMPLETED",
      measurableTotal: total,
      measurableCompleted: completed,
      measurableStarted: started,
    };
  }

  if (started > 0 || completed > 0) {
    return {
      status: "PARTIAL",
      measurableTotal: total,
      measurableCompleted: completed,
      measurableStarted: started,
    };
  }

  return {
    status: "EXPIRED",
    measurableTotal: total,
    measurableCompleted: completed,
    measurableStarted: started,
  };
}

/** Pendant le cycle : toutes tâches mesurables faites → peut clôturer en COMPLETED. */
export function allMeasurableTasksCompleted(tasks: WorkPlanTask[]): boolean {
  const { total, completed } = countMeasurableTasks(tasks);
  return total > 0 && completed >= total;
}
