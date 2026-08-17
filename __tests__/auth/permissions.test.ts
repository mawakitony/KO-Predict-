import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canActivateStudents,
  canChangeTeamRoles,
  canDisableStudents,
  canIssueStudentPasswordResetCode,
  canManageInterventions,
  canManageStudents,
  canManageTeam,
  canRegenerateActivationCode,
  canSendStudentPasswordRecovery,
  canSyncStudents,
  canViewStudentAudit,
  canViewStudents,
  canViewTeamAudit,
  staffPermissions,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/types/student";

const roles: UserRole[] = ["student", "coach", "admin", "super_admin"];

describe("permissions matrix", () => {
  it("student : dashboard only, pas d’admin", () => {
    expect(canAccessAdmin("student")).toBe(false);
    expect(canViewStudents("student")).toBe(false);
    expect(canActivateStudents("student")).toBe(false);
    expect(canManageTeam("student")).toBe(false);
    expect(canIssueStudentPasswordResetCode("student")).toBe(false);
  });

  it("coach : admin lecture, pas de gestion comptes, oui interventions", () => {
    expect(canAccessAdmin("coach")).toBe(true);
    expect(canViewStudents("coach")).toBe(true);
    expect(canManageStudents("coach")).toBe(false);
    expect(canManageInterventions("coach")).toBe(true);
    expect(canActivateStudents("coach")).toBe(false);
    expect(canDisableStudents("coach")).toBe(false);
    expect(canRegenerateActivationCode("coach")).toBe(false);
    expect(canSendStudentPasswordRecovery("coach")).toBe(false);
    expect(canIssueStudentPasswordResetCode("coach")).toBe(false);
    expect(canSyncStudents("coach")).toBe(false);
    expect(canManageTeam("coach")).toBe(false);
    expect(canChangeTeamRoles("coach")).toBe(false);
    expect(canViewStudentAudit("coach")).toBe(false);
    expect(canViewTeamAudit("coach")).toBe(false);
  });

  it("admin : gestion apprenants, pas d’équipe", () => {
    expect(canAccessAdmin("admin")).toBe(true);
    expect(canViewStudents("admin")).toBe(true);
    expect(canManageStudents("admin")).toBe(true);
    expect(canActivateStudents("admin")).toBe(true);
    expect(canDisableStudents("admin")).toBe(true);
    expect(canSendStudentPasswordRecovery("admin")).toBe(true);
    expect(canIssueStudentPasswordResetCode("admin")).toBe(true);
    expect(canSyncStudents("admin")).toBe(true);
    expect(canManageTeam("admin")).toBe(false);
    expect(canChangeTeamRoles("admin")).toBe(false);
    expect(canViewStudentAudit("admin")).toBe(true);
    expect(canViewTeamAudit("admin")).toBe(false);
  });

  it("super_admin : tout", () => {
    expect(canAccessAdmin("super_admin")).toBe(true);
    expect(canManageStudents("super_admin")).toBe(true);
    expect(canSendStudentPasswordRecovery("super_admin")).toBe(true);
    expect(canIssueStudentPasswordResetCode("super_admin")).toBe(true);
    expect(canManageTeam("super_admin")).toBe(true);
    expect(canChangeTeamRoles("super_admin")).toBe(true);
    expect(canViewStudentAudit("super_admin")).toBe(true);
    expect(canViewTeamAudit("super_admin")).toBe(true);
  });

  it("DISABLED concept : permissions basées uniquement sur le rôle (statut géré ailleurs)", () => {
    for (const role of roles) {
      const p = staffPermissions(role);
      expect(typeof p.canAccessAdmin).toBe("boolean");
      expect(typeof p.canIssueStudentPasswordResetCode).toBe("boolean");
    }
  });
});
