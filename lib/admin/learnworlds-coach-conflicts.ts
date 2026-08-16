/**
 * Conflits KO avant création d’un coach depuis LearnWorlds.
 * Logique pure — aucun I/O.
 */

import { parseUserRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types/student";

export type KoCoachConflictDecision =
  | { action: "allow_create" }
  | {
      action: "already_coach";
      profileId: string;
      accountStatus: string;
      message: string;
    }
  | {
      action: "block";
      code:
        | "existing_student"
        | "existing_admin"
        | "existing_super_admin"
        | "existing_disabled"
        | "existing_pending"
        | "existing_auth_orphan"
        | "existing_student_row";
      auditEvent:
        | "LEARNWORLDS_COACH_PROMOTION_BLOCKED"
        | "LEARNWORLDS_COACH_ROLE_CONFLICT";
      profileId: string | null;
      role: UserRole | null;
      accountStatus: string | null;
      message: string;
    };

export function resolveKoCoachCreationConflict(options: {
  profile: {
    id: string;
    role: string | null | undefined;
    accountStatus: string | null | undefined;
  } | null;
  authExists: boolean;
  hasStudentRow: boolean;
}): KoCoachConflictDecision {
  const profile = options.profile;

  if (profile) {
    const role = parseUserRole(profile.role);
    const status = profile.accountStatus ?? null;

    if (status === "DISABLED") {
      return {
        action: "block",
        code: "existing_disabled",
        auditEvent: "LEARNWORLDS_COACH_PROMOTION_BLOCKED",
        profileId: profile.id,
        role,
        accountStatus: status,
        message:
          "Ce compte KO Predict™ est désactivé. Réactivez-le manuellement avant toute action.",
      };
    }

    if (status === "PENDING_ACTIVATION") {
      return {
        action: "block",
        code: "existing_pending",
        auditEvent: "LEARNWORLDS_COACH_PROMOTION_BLOCKED",
        profileId: profile.id,
        role,
        accountStatus: status,
        message:
          "Un compte KO Predict™ est déjà en attente d’activation pour cet email. Ne pas recréer ni contourner le cycle d’accès.",
      };
    }

    if (role === "coach") {
      return {
        action: "already_coach",
        profileId: profile.id,
        accountStatus: status ?? "ACTIVE",
        message: "Ce compte est déjà coach KO Predict™.",
      };
    }

    if (role === "student") {
      return {
        action: "block",
        code: "existing_student",
        auditEvent: "LEARNWORLDS_COACH_PROMOTION_BLOCKED",
        profileId: profile.id,
        role,
        accountStatus: status,
        message:
          "Ce compte est déjà utilisé comme apprenant et nécessite un traitement manuel.",
      };
    }

    if (role === "admin") {
      return {
        action: "block",
        code: "existing_admin",
        auditEvent: "LEARNWORLDS_COACH_ROLE_CONFLICT",
        profileId: profile.id,
        role,
        accountStatus: status,
        message:
          "Ce compte est administrateur KO Predict™. Aucune rétrogradation en coach.",
      };
    }

    if (role === "super_admin") {
      return {
        action: "block",
        code: "existing_super_admin",
        auditEvent: "LEARNWORLDS_COACH_ROLE_CONFLICT",
        profileId: profile.id,
        role,
        accountStatus: status,
        message:
          "Ce compte est super administrateur. Aucune modification via ce flux.",
      };
    }
  }

  if (options.authExists) {
    return {
      action: "block",
      code: "existing_auth_orphan",
      auditEvent: "LEARNWORLDS_COACH_PROMOTION_BLOCKED",
      profileId: null,
      role: null,
      accountStatus: null,
      message:
        "Un compte Auth existe déjà pour cet email. Traitement manuel requis.",
    };
  }

  if (options.hasStudentRow) {
    return {
      action: "block",
      code: "existing_student_row",
      auditEvent: "LEARNWORLDS_COACH_PROMOTION_BLOCKED",
      profileId: null,
      role: null,
      accountStatus: null,
      message:
        "Une fiche apprenant existe déjà pour cet email. Traitement manuel requis.",
    };
  }

  return { action: "allow_create" };
}
