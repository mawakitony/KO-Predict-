import {
  isAdminOrAbove,
  isStaff,
  isStudent,
  isSuperAdmin,
} from "@/lib/auth/roles";
import type { UserRole } from "@/types/student";

/** Accès à l’espace /admin (coach+). */
export function canAccessAdmin(role: UserRole | null | undefined): boolean {
  return isStaff(role);
}

/** Dashboard apprenant : student, ou staff qui consulte la vue. */
export function canAccessStudentDashboard(
  role: UserRole | null | undefined,
): boolean {
  return isStudent(role) || isStaff(role);
}

export function canViewStudents(role: UserRole | null | undefined): boolean {
  return isStaff(role);
}

/** Activer / désactiver / sync / régénérer code apprenant. */
export function canManageStudents(role: UserRole | null | undefined): boolean {
  return isAdminOrAbove(role);
}

/**
 * File d’intervention coach : coach + admin + super_admin.
 * Ne donne PAS le droit d’activer / sync / gérer l’équipe.
 */
export function canManageInterventions(
  role: UserRole | null | undefined,
): boolean {
  return isStaff(role);
}

export function canActivateStudents(role: UserRole | null | undefined): boolean {
  return isAdminOrAbove(role);
}

export function canDisableStudents(role: UserRole | null | undefined): boolean {
  return isAdminOrAbove(role);
}

export function canRegenerateActivationCode(
  role: UserRole | null | undefined,
): boolean {
  return isAdminOrAbove(role);
}

/** Envoyer un lien de récupération mot de passe (apprenant ACTIVE). */
export function canSendStudentPasswordRecovery(
  role: UserRole | null | undefined,
): boolean {
  return isAdminOrAbove(role);
}

/** Émettre un code temporaire de réinitialisation (apprenant ACTIVE). */
export function canIssueStudentPasswordResetCode(
  role: UserRole | null | undefined,
): boolean {
  return isAdminOrAbove(role);
}

export function canSyncStudents(role: UserRole | null | undefined): boolean {
  return isAdminOrAbove(role);
}

export function canManageTeam(role: UserRole | null | undefined): boolean {
  return isSuperAdmin(role);
}

export function canChangeTeamRoles(role: UserRole | null | undefined): boolean {
  return isSuperAdmin(role);
}

export function canViewStudentAudit(
  role: UserRole | null | undefined,
): boolean {
  return isAdminOrAbove(role);
}

export function canViewTeamAudit(role: UserRole | null | undefined): boolean {
  return isSuperAdmin(role);
}

export function canViewStudentRecord(options: {
  role: UserRole;
  viewerProfileId: string;
  studentProfileId: string;
}): boolean {
  if (canViewStudents(options.role)) return true;
  return options.viewerProfileId === options.studentProfileId;
}

/** Snapshot UI / props client. */
export function staffPermissions(role: UserRole | null | undefined) {
  return {
    canAccessAdmin: canAccessAdmin(role),
    canViewStudents: canViewStudents(role),
    canManageStudents: canManageStudents(role),
    canManageInterventions: canManageInterventions(role),
    canActivateStudents: canActivateStudents(role),
    canDisableStudents: canDisableStudents(role),
    canRegenerateActivationCode: canRegenerateActivationCode(role),
    canSendStudentPasswordRecovery: canSendStudentPasswordRecovery(role),
    canIssueStudentPasswordResetCode: canIssueStudentPasswordResetCode(role),
    canSyncStudents: canSyncStudents(role),
    canManageTeam: canManageTeam(role),
    canChangeTeamRoles: canChangeTeamRoles(role),
    canViewStudentAudit: canViewStudentAudit(role),
    canViewTeamAudit: canViewTeamAudit(role),
  };
}

export type StaffPermissions = ReturnType<typeof staffPermissions>;
