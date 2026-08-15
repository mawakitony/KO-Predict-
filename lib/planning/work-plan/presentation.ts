/**
 * Présentation UI du plan de progression (déterministe, sans recalcul métier).
 */

import { formatDateShortFr } from "@/lib/dashboard/format";
import { countMeasurableTasks } from "@/lib/planning/work-plan/progress";
import { workPlanTypeLabelFr } from "@/lib/planning/work-plan/map-type";
import type {
  WorkPlanStatus,
  WorkPlanTask,
  WorkPlanTaskStatus,
  WorkPlanType,
} from "@/lib/planning/work-plan/types";
import type { PersistedWorkPlan } from "@/lib/planning/work-plan/memory-store";

export function formatWorkPlanPeriodFr(
  startsAt: string,
  endsAt: string,
): string {
  const start = formatDateShortFr(startsAt.slice(0, 10));
  const end = formatDateShortFr(endsAt.slice(0, 10));
  if (start === "—" || end === "—") return "Période indisponible";
  return `${start} → ${end}`;
}

export function workPlanStatusLabelFr(status: WorkPlanStatus): string {
  switch (status) {
    case "ACTIVE":
      return "En cours";
    case "COMPLETED":
      return "Atteint";
    case "PARTIAL":
      return "Partiellement atteint";
    case "EXPIRED":
      return "Expiré";
    case "SUPERSEDED":
      return "Remplacé";
    default:
      return status;
  }
}

export function workPlanTaskStatusLabelFr(status: WorkPlanTaskStatus): string {
  switch (status) {
    case "TODO":
      return "À faire";
    case "IN_PROGRESS":
      return "En cours";
    case "COMPLETED":
      return "Terminé";
    case "NOT_APPLICABLE":
      return "Non applicable";
    default:
      return status;
  }
}

/** Libellé activités uniquement si target et progress sont des nombres. */
export function formatActivitiesProgress(
  task: WorkPlanTask | undefined,
): string | null {
  if (!task || task.type !== "ACTIVITIES") return null;
  if (task.target == null || !(task.target > 0)) return null;
  const progress = task.progress == null ? 0 : Math.max(0, task.progress);
  return `${progress} / ${task.target}`;
}

export function findActivitiesTask(
  tasks: WorkPlanTask[],
): WorkPlanTask | undefined {
  return tasks.find((t) => t.type === "ACTIVITIES");
}

export interface WorkPlanSummaryView {
  planType: WorkPlanType;
  typeLabel: string;
  periodLabel: string;
  primaryObjective: string;
  reason: string;
  activitiesLabel: string | null;
  measurableCompleted: number;
  measurableTotal: number;
  reevaluationLabel: string;
  status: WorkPlanStatus;
  statusLabel: string;
}

export function buildWorkPlanSummaryView(
  plan: PersistedWorkPlan,
): WorkPlanSummaryView {
  const { completed, total } = countMeasurableTasks(plan.tasks);
  const activities = formatActivitiesProgress(findActivitiesTask(plan.tasks));
  return {
    planType: plan.planType,
    typeLabel: workPlanTypeLabelFr(plan.planType),
    periodLabel: formatWorkPlanPeriodFr(plan.startsAt, plan.endsAt),
    primaryObjective: plan.snapshot.primaryObjective,
    reason: plan.snapshot.reason,
    activitiesLabel: activities,
    measurableCompleted: completed,
    measurableTotal: total,
    reevaluationLabel: formatDateShortFr(plan.endsAt.slice(0, 10)),
    status: plan.status,
    statusLabel: workPlanStatusLabelFr(plan.status),
  };
}

export function buildPreviousPlanRow(plan: PersistedWorkPlan): {
  id: string;
  typeLabel: string;
  periodLabel: string;
  statusLabel: string;
  activitiesLabel: string | null;
} {
  return {
    id: plan.id,
    typeLabel: workPlanTypeLabelFr(plan.planType),
    periodLabel: formatWorkPlanPeriodFr(plan.startsAt, plan.endsAt),
    statusLabel: workPlanStatusLabelFr(plan.status),
    activitiesLabel: formatActivitiesProgress(findActivitiesTask(plan.tasks)),
  };
}
