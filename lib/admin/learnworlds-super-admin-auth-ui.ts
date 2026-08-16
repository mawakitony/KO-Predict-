/**
 * Types + messages UI — autorisations Super Admin LearnWorlds.
 * Sans I/O. Ne déclenche aucune promotion de rôle.
 */

import { MFA_AAL2_REQUIRED } from "@/lib/auth/mfa-aal";

export type LwSuperAdminAuthorizationStatus = "ACTIVE" | "REVOKED";

export type LwSuperAdminAuthorizationListItem = {
  id: string;
  email: string;
  learnworldsUserId: string | null;
  status: LwSuperAdminAuthorizationStatus;
  createdBy: string;
  createdAt: string;
  revokedBy: string | null;
  revokedAt: string | null;
  note: string | null;
  learnworldsRoleLevel: string | null;
};

export const LW_SA_AUTH_NOT_PROMOTION_NOTICE =
  "Cette autorisation ne donne pas encore le rôle Super administrateur dans KO Predict™.";

export const LW_SA_AUTH_REVOKE_NOTICE =
  "La révocation empêche les futures promotions mais ne modifie pas automatiquement le rôle KO Predict™ existant.";

export const LW_SA_AUTH_MFA_NEXT = "/admin/team";

export function mapLwSuperAdminAuthApiError(options: {
  status: number;
  body: { error?: string; reasonCode?: string; code?: string } | null;
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

  switch (reason) {
    case "DUPLICATE_ACTIVE":
      return {
        message: "Une autorisation ACTIVE existe déjà pour cet email.",
        needsMfaChallenge: false,
      };
    case "LW_NOT_FOUND":
      return {
        message: "Aucun compte LearnWorlds trouvé avec cette adresse.",
        needsMfaChallenge: false,
      };
    case "LW_ID_MISMATCH":
    case "EMAIL_MISMATCH":
      return {
        message:
          "L’identité LearnWorlds ne correspond pas à l’email demandé. Actualisez la vérification.",
        needsMfaChallenge: false,
      };
    case "ACTOR_NOT_SUPER_ADMIN":
      return {
        message: "Action réservée au super administrateur.",
        needsMfaChallenge: false,
      };
    default:
      return {
        message:
          options.body?.error ?? "Action sur l’autorisation impossible.",
        needsMfaChallenge: false,
      };
  }
}

export function formatLwIdentityLabel(options: {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
}): string {
  const name = [options.firstName, options.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || options.email;
}

export const LW_SA_AUTH_SECTION_ID = "lw-sa-authorizations";

export type AdminPromoteLwAuthUiState =
  | "can_promote"
  | "auth_required"
  | "auth_revoked";

/**
 * UI only — le serveur revalide toujours l’autorisation ACTIVE.
 * Première ACTIVE pour l’email gagne ; sinon REVOKED si présente ; sinon requise.
 */
export function resolveAdminPromoteLwAuthUiState(options: {
  memberEmail: string | null | undefined;
  authorizations: Array<{
    email: string;
    status: LwSuperAdminAuthorizationStatus;
  }>;
}): AdminPromoteLwAuthUiState {
  const email = options.memberEmail?.trim().toLowerCase() ?? "";
  if (!email) return "auth_required";

  const forEmail = options.authorizations.filter(
    (a) => a.email.trim().toLowerCase() === email,
  );
  if (forEmail.some((a) => a.status === "ACTIVE")) return "can_promote";
  if (forEmail.some((a) => a.status === "REVOKED")) return "auth_revoked";
  return "auth_required";
}

export const LW_SUPER_ADMIN_AUTH_REQUIRED = "LW_SUPER_ADMIN_AUTH_REQUIRED";
export const LW_SUPER_ADMIN_AUTH_REVOKED = "LW_SUPER_ADMIN_AUTH_REVOKED";
export const LW_SUPER_ADMIN_ID_MISMATCH = "LW_SUPER_ADMIN_ID_MISMATCH";

