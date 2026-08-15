import type { WeeklyPlanStatus } from "@/lib/planning/weekly-plan";
import type { WorkPlanType } from "@/lib/planning/work-plan/types";

/**
 * WeeklyPlanStatus → type de plan persistant.
 * Une seule source logique : pas de moteur concurrent.
 */
export function mapWeeklyStatusToPlanType(
  status: WeeklyPlanStatus,
): WorkPlanType {
  switch (status) {
    case "INSUFFICIENT_DATA":
      return "STARTUP";
    case "NO_ACTIVITY":
    case "BEHIND":
    case "SLIGHTLY_BEHIND":
      return "CATCH_UP";
    case "ON_TRACK":
    case "AHEAD":
    case "COMPLETE":
      return "CONSOLIDATION";
    default:
      return "STARTUP";
  }
}

export function workPlanTypeLabelFr(type: WorkPlanType): string {
  switch (type) {
    case "STARTUP":
      return "Plan de démarrage";
    case "CATCH_UP":
      return "Plan de rattrapage";
    case "CONSOLIDATION":
      return "Plan de consolidation";
    default:
      return "Mon plan de progression";
  }
}
