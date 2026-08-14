import type { AdminStudentRow } from "@/lib/admin/types";
import type { RiskLevel } from "@/types/prediction";

export const INTERVENTION_STATUSES = [
  "OPEN",
  "CONTACTED",
  "FOLLOW_UP",
  "RESOLVED",
] as const;

export type InterventionStatus = (typeof INTERVENTION_STATUSES)[number];

export const ACTIVE_INTERVENTION_STATUSES: readonly InterventionStatus[] = [
  "OPEN",
  "CONTACTED",
  "FOLLOW_UP",
] as const;

export const INTERVENTION_REASON_CODES = [
  "RISK_CRITICAL",
  "RISK_RED",
  "RISK_AMBER",
  "INACTIVE_7_DAYS",
  "PACE_BEHIND",
  "EXAM_SOON",
  "ZERO_CURRENT_PACE",
] as const;

export type InterventionReasonCode =
  (typeof INTERVENTION_REASON_CODES)[number];

export interface CoachInterventionRecord {
  id: string;
  studentId: string;
  status: InterventionStatus;
  priority: number;
  assignedTo: string | null;
  reasons: InterventionReasonCode[];
  riskLevel: RiskLevel | null;
  createdAt: string;
  contactedAt: string | null;
  resolvedAt: string | null;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface CoachInterventionCard {
  intervention: CoachInterventionRecord;
  row: AdminStudentRow;
}

export function isActiveInterventionStatus(
  status: InterventionStatus,
): boolean {
  return ACTIVE_INTERVENTION_STATUSES.includes(status);
}

export function riskToPriority(risk: RiskLevel | null | undefined): number {
  switch (risk) {
    case "CRITICAL":
      return 0;
    case "RED":
      return 1;
    case "AMBER":
      return 2;
    default:
      return 3;
  }
}

export function interventionReasonLabelFr(code: InterventionReasonCode): string {
  switch (code) {
    case "RISK_CRITICAL":
      return "Risque critique";
    case "RISK_RED":
      return "Risque élevé";
    case "RISK_AMBER":
      return "À surveiller";
    case "INACTIVE_7_DAYS":
      return "Inactivité ≥ 7 jours";
    case "PACE_BEHIND":
      return "Rythme insuffisant";
    case "EXAM_SOON":
      return "Examen proche";
    case "ZERO_CURRENT_PACE":
      return "Aucune activité récente";
    default:
      return code;
  }
}

export function interventionStatusLabelFr(status: InterventionStatus): string {
  switch (status) {
    case "OPEN":
      return "Ouvert";
    case "CONTACTED":
      return "Contacté";
    case "FOLLOW_UP":
      return "À rappeler";
    case "RESOLVED":
      return "Terminé";
    default:
      return status;
  }
}
