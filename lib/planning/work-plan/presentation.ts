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
import type { MessageKey } from "@/lib/i18n/translate";
import { translate } from "@/lib/i18n/translate";
import type { PaceStatus } from "@/types/prediction";
import type { WeeklyPlanStatus } from "@/lib/planning/weekly-plan";

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
  /** Ex. « 0/2 objectifs mesurables » — jamais le total brut des tâches. */
  measurableProgressLabel: string;
  taskCount: number;
  reevaluationLabel: string;
  status: WorkPlanStatus;
  statusLabel: string;
}

export type WorkPlanPaceTone = "up" | "down" | "neutral";

/** Libellés rythme UI — une seule source pour KPI + courbe. */
export interface WorkPlanPaceView {
  valueKey: MessageKey;
  detailKey: MessageKey;
  valueLabel: string;
  detailLabel: string;
  tone: WorkPlanPaceTone;
}

function paceCopy(
  valueKey: MessageKey,
  detailKey: MessageKey,
  tone: WorkPlanPaceTone,
): WorkPlanPaceView {
  return {
    valueKey,
    detailKey,
    valueLabel: translate("fr", valueKey),
    detailLabel: translate("fr", detailKey),
    tone,
  };
}

/**
 * Rythme affiché à partir des données métier du snapshot / type de plan.
 * Ne compare jamais un % mesurable au temps écoulé du cycle.
 */
export function buildWorkPlanPaceView(plan: PersistedWorkPlan): WorkPlanPaceView {
  return mapWorkPlanPaceView({
    paceStatus: plan.snapshot.paceStatusStart,
    weeklyStatus: plan.snapshot.weeklyStatusStart,
    planType: plan.planType,
  });
}

export function mapWorkPlanPaceView(input: {
  paceStatus: PaceStatus | null;
  weeklyStatus: WeeklyPlanStatus;
  planType: WorkPlanType;
}): WorkPlanPaceView {
  const { paceStatus, weeklyStatus, planType } = input;

  if (paceStatus === "AHEAD" || weeklyStatus === "AHEAD") {
    return paceCopy(
      "learner.planUi.paceAhead",
      "learner.planUi.paceAhead",
      "up",
    );
  }

  if (paceStatus === "ON_TRACK" || weeklyStatus === "ON_TRACK") {
    return paceCopy(
      "learner.planUi.paceOnTrack",
      "learner.planUi.paceOnTrack",
      "up",
    );
  }

  if (paceStatus === "NO_ACTIVITY" || weeklyStatus === "NO_ACTIVITY") {
    return paceCopy(
      "learner.planUi.paceResume",
      "learner.planUi.paceResumeDetail",
      "down",
    );
  }

  if (
    paceStatus === "BEHIND" ||
    paceStatus === "SLIGHTLY_BEHIND" ||
    weeklyStatus === "BEHIND" ||
    weeklyStatus === "SLIGHTLY_BEHIND" ||
    planType === "CATCH_UP"
  ) {
    return paceCopy(
      "learner.planUi.paceCatchUp",
      "learner.planUi.paceCatchUpDetail",
      "down",
    );
  }

  if (
    planType === "STARTUP" ||
    weeklyStatus === "INSUFFICIENT_DATA" ||
    paceStatus == null
  ) {
    return paceCopy(
      "learner.planUi.paceToClarify",
      "learner.planUi.paceInsufficient",
      "neutral",
    );
  }

  if (planType === "CONSOLIDATION" || weeklyStatus === "COMPLETE") {
    return paceCopy(
      "learner.planUi.paceOnTrack",
      "learner.planUi.paceOnTrack",
      "up",
    );
  }

  return paceCopy(
    "date.empty",
    "learner.planUi.paceUnavailable",
    "neutral",
  );
}

export interface WorkPlanTaskProgressView {
  /** null = pas de pourcentage affiché (guidance / non mesurable). */
  percent: number | null;
  label: string;
  showGauge: boolean;
}

/**
 * Progression affichable d'une tâche.
 * QCM_PRACTICE / MAINTAIN_PACE = guidance : jamais de 50 % conventionnel.
 */
export function workPlanTaskProgressView(
  task: WorkPlanTask,
): WorkPlanTaskProgressView {
  if (task.type === "QCM_PRACTICE" || task.type === "MAINTAIN_PACE") {
    return {
      percent: null,
      label: "Objectif qualitatif",
      showGauge: false,
    };
  }

  if (!task.measurable) {
    return {
      percent: null,
      label: "Orientation",
      showGauge: false,
    };
  }

  if (task.status === "COMPLETED") {
    return { percent: 100, label: "100%", showGauge: true };
  }

  if (task.type === "ACTIVITIES" && task.target != null && task.target > 0) {
    const progress = task.progress == null ? 0 : Math.max(0, task.progress);
    const percent = Math.min(100, Math.round((progress / task.target) * 100));
    return {
      percent,
      label: `${percent}%`,
      showGauge: true,
    };
  }

  // Mesurable binaire (date, reprise) : 0 % tant que non terminé — jamais 50 %.
  return { percent: 0, label: "0%", showGauge: true };
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
    measurableProgressLabel: `${completed}/${total} objectifs mesurables`,
    taskCount: plan.tasks.length,
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
