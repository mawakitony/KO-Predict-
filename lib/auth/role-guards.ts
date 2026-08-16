import { isStaff, parseUserRole } from "@/lib/auth/roles";
import type { UserRole } from "@/types/student";

/** Sources automatiques — jamais d’élévation / rétrogradation staff via ces flux. */
export type AutomaticRoleChangeSource =
  | "activate_learner"
  | "learnworlds_sync"
  | "webhook"
  | "cron"
  | "first_access"
  | "other_automatic";

export type RoleChangeGuardResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: string;
      auditEvent:
        | "SUPER_ADMIN_ROLE_CHANGE_BLOCKED"
        | "STAFF_ROLE_CHANGE_BLOCKED";
      currentRole: UserRole;
      proposedRole: UserRole;
    };

/**
 * Bloque toute modification automatique qui rétrograderait un super_admin
 * ou transformerait un coach/admin en student.
 */
export function evaluateAutomaticRoleChange(options: {
  currentRole: UserRole | string | null | undefined;
  proposedRole: UserRole | string | null | undefined;
  source: AutomaticRoleChangeSource;
}): RoleChangeGuardResult {
  const currentRole = parseUserRole(options.currentRole);
  const proposedRole = parseUserRole(options.proposedRole);

  if (currentRole === proposedRole) {
    return { allowed: true };
  }

  if (currentRole === "super_admin" && proposedRole !== "super_admin") {
    return {
      allowed: false,
      reason:
        "Le rôle super_admin ne peut pas être modifié par un flux automatique.",
      auditEvent: "SUPER_ADMIN_ROLE_CHANGE_BLOCKED",
      currentRole,
      proposedRole,
    };
  }

  if (
    (currentRole === "coach" || currentRole === "admin") &&
    proposedRole === "student"
  ) {
    return {
      allowed: false,
      reason:
        "Un compte staff (coach/admin) ne peut pas être activé comme apprenant.",
      auditEvent: "STAFF_ROLE_CHANGE_BLOCKED",
      currentRole,
      proposedRole,
    };
  }

  // Autres changements automatiques de rôle staff : refus par défaut.
  if (isStaff(currentRole) && currentRole !== proposedRole) {
    return {
      allowed: false,
      reason: "Modification automatique de rôle staff refusée.",
      auditEvent:
        currentRole === "super_admin"
          ? "SUPER_ADMIN_ROLE_CHANGE_BLOCKED"
          : "STAFF_ROLE_CHANGE_BLOCKED",
      currentRole,
      proposedRole,
    };
  }

  return { allowed: true };
}

/** Compte déjà staff → activation apprenant interdite. */
export function isStaffProtectedFromLearnerActivation(
  role: UserRole | string | null | undefined,
): boolean {
  return isStaff(parseUserRole(role));
}

/**
 * LearnWorlds n’est jamais source d’autorité pour `super_admin` KO.
 * `is_admin:true` / role.level admin → aucun mapping vers super_admin.
 */
export function koRoleFromLearnWorldsAdminFlags(_flags: {
  is_admin?: boolean | null;
  is_instructor?: boolean | null;
  roleLevel?: string | null;
  roleName?: string | null;
}): UserRole | null {
  // Intentionnel : pas de promotion automatique depuis LearnWorlds.
  void _flags;
  return null;
}

/**
 * Champs d’identité profil autorisés depuis une sync LearnWorlds.
 * Ne jamais y inclure `role` / `account_status`.
 */
export function buildLearnWorldsProfileIdentityUpdate(options: {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  existingFirstName: string | null | undefined;
  existingLastName: string | null | undefined;
}): {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  updated_at: string;
} {
  return {
    first_name: options.existingFirstName || options.firstName,
    last_name: options.existingLastName || options.lastName,
    email: options.email,
    updated_at: new Date().toISOString(),
  };
}
