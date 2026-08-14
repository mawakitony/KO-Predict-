import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type { AdminStudentRow } from "@/lib/admin/types";
import {
  riskToPriority,
  type CoachInterventionRecord,
  type InterventionReasonCode,
  type InterventionStatus,
} from "@/lib/admin/interventions/types";
import type { RiskLevel } from "@/types/prediction";

const EXAM_SOON_DAYS = 14;

/** Risques qui ouvrent / maintiennent une intervention V1. */
export function riskNeedsIntervention(
  risk: RiskLevel | null | undefined,
): boolean {
  return risk === "CRITICAL" || risk === "RED" || risk === "AMBER";
}

export function deriveInterventionReasons(
  row: AdminStudentRow,
  asOf: Date = new Date(),
): InterventionReasonCode[] {
  const reasons: InterventionReasonCode[] = [];
  const risk = row.prediction.riskLevel;

  if (risk === "CRITICAL") reasons.push("RISK_CRITICAL");
  else if (risk === "RED") reasons.push("RISK_RED");
  else if (risk === "AMBER") reasons.push("RISK_AMBER");

  const inactive = row.metrics.inactiveDays;
  if (inactive != null && inactive >= 7) {
    reasons.push("INACTIVE_7_DAYS");
  }

  const paceStatus = row.prediction.paceStatus;
  if (paceStatus === "BEHIND" || paceStatus === "SLIGHTLY_BEHIND") {
    reasons.push("PACE_BEHIND");
  }

  if (
    row.prediction.currentPace === 0 ||
    paceStatus === "NO_ACTIVITY"
  ) {
    reasons.push("ZERO_CURRENT_PACE");
  }

  const target = row.student.targetExamDate;
  if (target) {
    const days = differenceInCalendarDays(
      startOfDay(parseISO(target)),
      startOfDay(asOf),
    );
    if (days >= 0 && days <= EXAM_SOON_DAYS) {
      reasons.push("EXAM_SOON");
    }
  }

  return reasons;
}

export type EnsureDecision =
  | { action: "insert"; reasons: InterventionReasonCode[]; priority: number }
  | {
      action: "update";
      reasons: InterventionReasonCode[];
      priority: number;
      riskLevel: RiskLevel;
    }
  | { action: "noop" };

/**
 * Idempotence V1 :
 * - risque AMBER+ + pas de cycle actif → insert
 * - risque AMBER+ + cycle actif → update motifs/priorité (pas de 2e cycle)
 * - risque hors seuil → noop (ne ferme pas auto)
 * - cycle RESOLVED + nouveau risque → insert (nouveau cycle)
 */
export function decideEnsureAction(options: {
  riskLevel: RiskLevel | null;
  reasons: InterventionReasonCode[];
  active: CoachInterventionRecord | null;
}): EnsureDecision {
  const { riskLevel, reasons, active } = options;
  if (!riskNeedsIntervention(riskLevel)) {
    return { action: "noop" };
  }

  const priority = riskToPriority(riskLevel);
  if (!active) {
    return { action: "insert", reasons, priority };
  }

  const sameReasons =
    active.reasons.length === reasons.length &&
    reasons.every((r) => active.reasons.includes(r));
  const samePriority = active.priority === priority;
  const sameRisk = active.riskLevel === riskLevel;

  if (sameReasons && samePriority && sameRisk) {
    return { action: "noop" };
  }

  return {
    action: "update",
    reasons,
    priority,
    riskLevel: riskLevel!,
  };
}

/** Tri file coach V1 : priorité risque → date examen proche → inactivité. */
export function compareInterventionRows(
  a: {
    priority: number;
    targetExamDate: string | null;
    inactiveDays: number | null;
  },
  b: {
    priority: number;
    targetExamDate: string | null;
    inactiveDays: number | null;
  },
): number {
  if (a.priority !== b.priority) return a.priority - b.priority;

  const ta = a.targetExamDate;
  const tb = b.targetExamDate;
  if (ta && tb && ta !== tb) return ta < tb ? -1 : 1;
  if (ta && !tb) return -1;
  if (!ta && tb) return 1;

  const ia = a.inactiveDays ?? -1;
  const ib = b.inactiveDays ?? -1;
  return ib - ia;
}

export function canTransitionInterventionStatus(
  from: InterventionStatus,
  to: InterventionStatus,
): boolean {
  if (from === to) return false;
  if (from === "RESOLVED") return false;
  if (to === "OPEN") return false;
  return true;
}
