import type {
  DashboardMetricsView,
  DashboardStudentView,
} from "@/lib/dashboard/types";
import type {
  PredictionHistory,
  PredictionResult,
  RiskLevel,
} from "@/types/prediction";

export const RISK_SORT_ORDER: Record<RiskLevel, number> = {
  CRITICAL: 0,
  RED: 1,
  AMBER: 2,
  GREEN: 3,
};

export interface AdminStudentRow {
  student: DashboardStudentView;
  metrics: DashboardMetricsView;
  prediction: PredictionResult;
  accountStatus?: ProfileAccountStatusDb;
}

export interface AdminStudentDetail extends AdminStudentRow {
  history: PredictionHistory[];
  dataSource: "demo" | "database";
  email?: string | null;
}

/** Statut compte côté UI liste LearnWorlds / KO Predict. */
export type KoPredictAccountStatus =
  | "NOT_ACTIVATED"
  | "PENDING_ACTIVATION"
  | "ACTIVE"
  | "DISABLED"
  | "ERROR";

/** @deprecated Parcours email — table conservée en historique uniquement. */
export type InvitationDbStatus =
  | "PENDING"
  | "ACCEPTED"
  | "FAILED"
  | "EXPIRED";

export type ProfileAccountStatusDb =
  | "ACTIVE"
  | "DISABLED"
  | "PENDING_ACTIVATION";

export type PredictionStatus =
  | "NONE"
  | "READY"
  | "INSUFFICIENT_DATA"
  | "ERROR";

export interface LearnWorldsRosterRow {
  learnworldsUserId: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  tags: string[];
  createdAt: string | null;
  accountStatus: KoPredictAccountStatus;
  invitationStatus: InvitationDbStatus | null;
  studentId: string | null;
  profileId: string | null;
  invitationError: string | null;
}

/** Lien dossier — données conservées (y compris avant finalisation). */
export function adminStudentDetailHref(
  accountStatus: KoPredictAccountStatus,
  studentId: string | null,
): string | null {
  if (
    (accountStatus === "ACTIVE" ||
      accountStatus === "DISABLED" ||
      accountStatus === "PENDING_ACTIVATION") &&
    studentId
  ) {
    return `/admin/students/${studentId}`;
  }
  return null;
}

export interface LearnWorldsRosterPage {
  rows: LearnWorldsRosterRow[];
  page: number;
  itemsPerPage: number;
  totalItems: number | null;
  totalPages: number | null;
}
