import type { WeeklyPlanStatus } from "@/lib/planning/weekly-plan";
import type {
  MajorPlanEvent,
  WorkPlanMetricsNow,
  WorkPlanSnapshot,
} from "@/lib/planning/work-plan/types";

function hasDate(value: string | null | undefined): boolean {
  return value != null && value.trim() !== "";
}

/**
 * Événements majeurs V1 (liste restreinte).
 * Pas de SUPERSEDE pour NO_ACTIVITY seul, readiness, risk, ±1 activité, etc.
 */
export function detectMajorPlanEvents(options: {
  snapshot: WorkPlanSnapshot;
  now: WorkPlanMetricsNow;
  /** Statut WeeklyPlan au moment de la création du plan actif. */
  weeklyStatusAtStart: WeeklyPlanStatus;
  /** Statut WeeklyPlan recalculé maintenant. */
  weeklyStatusNow: WeeklyPlanStatus;
}): MajorPlanEvent[] {
  const { snapshot, now, weeklyStatusAtStart, weeklyStatusNow } = options;
  const events: MajorPlanEvent[] = [];

  const hadDate = hasDate(snapshot.targetExamDateStart);
  const hasDateNow = hasDate(now.targetExamDate);

  if (!hadDate && hasDateNow) {
    events.push("TARGET_DATE_BECAME_AVAILABLE");
  }
  if (hadDate && !hasDateNow) {
    events.push("TARGET_DATE_REMOVED");
  }

  if (
    weeklyStatusAtStart === "INSUFFICIENT_DATA" &&
    weeklyStatusNow !== "INSUFFICIENT_DATA" &&
    weeklyStatusNow !== "COMPLETE" &&
    now.requiredPace != null &&
    now.requiredPace > 0
  ) {
    events.push("FIRST_RELIABLE_TRAJECTORY");
  }

  // LEARNING_COMPLETED : remaining → 0 / statut COMPLETE (pas déjà COMPLETE au départ)
  if (
    weeklyStatusAtStart !== "COMPLETE" &&
    (now.remainingActivities === 0 || weeklyStatusNow === "COMPLETE")
  ) {
    events.push("LEARNING_COMPLETED");
  }

  return events;
}

export function shouldSupersedeForMajorEvents(
  events: MajorPlanEvent[],
): boolean {
  return events.length > 0;
}
