/**
 * Messages / helpers UI — « Modifier le rôle » (coach ↔ admin).
 * Logique pure testable, sans I/O.
 */

import { MFA_AAL2_REQUIRED } from "@/lib/auth/mfa-aal";
import { roleLabelFr, type TeamCreatableRole } from "@/lib/auth/roles";
import type { ProfileAccountStatus } from "@/lib/admin/account-access-constants";
import type { UserRole } from "@/types/student";

export function canShowChangeTeamRoleAction(options: {
  role: UserRole;
  accountStatus: ProfileAccountStatus;
  isSelf: boolean;
}): boolean {
  if (options.isSelf) return false;
  if (options.role !== "coach" && options.role !== "admin") return false;
  return options.accountStatus === "ACTIVE";
}

export function formatTeamRoleTransitionSummary(
  from: TeamCreatableRole,
  to: TeamCreatableRole,
): string {
  return `${roleLabelFr(from)} → ${roleLabelFr(to)}`;
}

export function mapChangeTeamRoleApiError(options: {
  status: number;
  body: { error?: string; code?: string; reasonCode?: string } | null;
}): { message: string; needsMfaChallenge: boolean } {
  const reason =
    options.body?.reasonCode ?? options.body?.code ?? null;
  if (
    options.status === 403 &&
    (reason === MFA_AAL2_REQUIRED ||
      options.body?.error?.includes("MFA_AAL2") ||
      options.body?.error?.toLowerCase().includes("aal2"))
  ) {
    return {
      message:
        "Vérification en deux étapes requise. Validez votre code authenticator puis réessayez.",
      needsMfaChallenge: true,
    };
  }
  return {
    message: options.body?.error ?? "Changement de rôle impossible.",
    needsMfaChallenge: false,
  };
}

export const CHANGE_TEAM_ROLE_MFA_NEXT = "/admin/team";
