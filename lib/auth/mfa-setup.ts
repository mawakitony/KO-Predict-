/**
 * Décisions d’accès à /auth/mfa/setup — pure, sans secrets.
 */

import type { UserRole } from "@/types/student";
import {
  isSuperAdminMfaEnforcementEnabled,
  SUPER_ADMIN_MFA_MIN_ACTIVE,
} from "@/lib/auth/mfa-aal";
import { homePathForRole } from "@/lib/auth/roles";

export type MfaFactorStatusLite = "verified" | "unverified" | string;

export interface MfaTotpFactorLite {
  id: string;
  status: MfaFactorStatusLite;
}

export type MfaSetupAccessDecision =
  | { action: "allow_setup" }
  | {
      action: "redirect";
      to: string;
      reason:
        | "unauthenticated"
        | "disabled"
        | "pending"
        | "not_super_admin"
        | "enforcement_disabled"
        | "already_verified";
    };

export function resolveMfaSetupAccess(options: {
  authenticated: boolean;
  role: UserRole | null | undefined;
  accountStatus: string | null | undefined;
  activeSuperAdminCount: number;
  verifiedTotpFactorCount: number;
  minActiveSuperAdmins?: number;
}): MfaSetupAccessDecision {
  if (!options.authenticated) {
    return {
      action: "redirect",
      to: "/login?next=%2Fauth%2Fmfa%2Fsetup",
      reason: "unauthenticated",
    };
  }
  if (options.accountStatus === "DISABLED") {
    return { action: "redirect", to: "/access-disabled", reason: "disabled" };
  }
  if (options.accountStatus === "PENDING_ACTIVATION") {
    return { action: "redirect", to: "/first-access", reason: "pending" };
  }
  if (options.role !== "super_admin") {
    return {
      action: "redirect",
      to: homePathForRole(options.role),
      reason: "not_super_admin",
    };
  }

  const min = options.minActiveSuperAdmins ?? SUPER_ADMIN_MFA_MIN_ACTIVE;
  if (!isSuperAdminMfaEnforcementEnabled(options.activeSuperAdminCount, min)) {
    return {
      action: "redirect",
      to: "/admin",
      reason: "enforcement_disabled",
    };
  }

  if (options.verifiedTotpFactorCount > 0) {
    return {
      action: "redirect",
      to: "/admin",
      reason: "already_verified",
    };
  }

  return { action: "allow_setup" };
}

/** IDs des facteurs TOTP non vérifiés. */
export function listUnverifiedTotpFactorIds(
  factors: MfaTotpFactorLite[] | null | undefined,
): string[] {
  if (!factors?.length) return [];
  return factors
    .filter((f) => f.status !== "verified" && Boolean(f.id))
    .map((f) => f.id);
}

/** Cleanup programmatique : exclut explicitement le facteur UI courant. */
export function listUnverifiedTotpFactorIdsExcluding(
  factors: MfaTotpFactorLite[] | null | undefined,
  excludeFactorId?: string | null,
): string[] {
  const ids = listUnverifiedTotpFactorIds(factors);
  if (!excludeFactorId) return ids;
  return ids.filter((id) => id !== excludeFactorId);
}

export function countVerifiedTotpFactors(
  factors: MfaTotpFactorLite[] | null | undefined,
): number {
  if (!factors?.length) return 0;
  return factors.filter((f) => f.status === "verified").length;
}

export function isValidTotpCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

/**
 * Mount / remount : verified → stop ; sinon enroll SANS cleanup auto.
 * Ne supprime jamais le facteur affiché (aucun unenroll ici).
 */
export function resolveTotpMountPrep(
  factors: MfaTotpFactorLite[] | null | undefined,
): { action: "already_verified" } | { action: "enroll" } {
  if (countVerifiedTotpFactors(factors) > 0) {
    return { action: "already_verified" };
  }
  return { action: "enroll" };
}

/**
 * @deprecated Prefer resolveTotpMountPrep — mount ne cleanup plus.
 * Conservé pour Recommencer via listUnverifiedTotpFactorIds.
 */
export function resolveTotpEnrollPrep(
  factors: MfaTotpFactorLite[] | null | undefined,
):
  | { action: "already_verified" }
  | { action: "enroll"; unverifiedIdsToRemove: string[] } {
  if (countVerifiedTotpFactors(factors) > 0) {
    return { action: "already_verified" };
  }
  return {
    action: "enroll",
    unverifiedIdsToRemove: [],
  };
}

/**
 * Action explicite « Recommencer » : retirer les unverified (dont le courant),
 * puis nouvel enroll. excludeFactorId = ne pas toucher un autre facteur UI.
 */
export function resolveTotpRestartCleanupIds(
  factors: MfaTotpFactorLite[] | null | undefined,
  options?: { excludeFactorId?: string | null },
): string[] {
  if (options?.excludeFactorId) {
    return listUnverifiedTotpFactorIdsExcluding(
      factors,
      options.excludeFactorId,
    );
  }
  return listUnverifiedTotpFactorIds(factors);
}

/** Mappe la réponse enroll → champs UI mémoire uniquement (pas de persistence). */
export function mapTotpEnrollForDisplay(enrolled: {
  id: string;
  totp: { qr_code: string; secret: string };
}): { factorId: string; qrDataUrl: string; manualSecret: string } {
  const qr = enrolled.totp.qr_code;
  return {
    factorId: enrolled.id,
    qrDataUrl: qr.startsWith("data:")
      ? qr
      : `data:image/svg+xml;utf8,${encodeURIComponent(qr)}`,
    manualSecret: enrolled.totp.secret,
  };
}

export function resolveTotpVerifyOutcome(
  currentLevel: string | null | undefined,
): "ok_aal2" | "aal_incomplete" {
  return currentLevel === "aal2" ? "ok_aal2" : "aal_incomplete";
}

/** Erreur submit : l’UI doit conserver QR + factorId (jamais auto re-enroll). */
export function shouldPreserveEnrollmentUiOnSubmitError(): boolean {
  return true;
}

export function extractAuthErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if ("code" in error && typeof (error as { code: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return null;
}

export function mapMfaSetupError(error: unknown): string {
  const code = extractAuthErrorCode(error);
  if (code === "mfa_verification_failed") {
    return "Code incorrect. Vérifiez l’application d’authentification et réessayez.";
  }
  if (code === "mfa_factor_not_found") {
    return "Configuration MFA introuvable. Utilisez « Recommencer la configuration ».";
  }
  if (code === "mfa_challenge_expired") {
    return "Le défi a expiré. Entrez un nouveau code et réessayez.";
  }
  if (code === "mfa_ip_address_mismatch") {
    return "Adresse réseau incohérente. Réessayez depuis la même connexion, ou recommencez la configuration.";
  }

  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : "";

  const lower = message.toLowerCase();
  if (
    lower.includes("invalid") ||
    lower.includes("incorrect") ||
    lower.includes("totp")
  ) {
    return "Code incorrect. Vérifiez l’application d’authentification et réessayez.";
  }
  if (lower.includes("expired") || lower.includes("timeout")) {
    return "Le défi a expiré. Entrez un nouveau code et réessayez.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Erreur réseau. Vérifiez votre connexion et réessayez.";
  }
  if (lower.includes("session")) {
    return "Session expirée. Reconnectez-vous puis recommencez.";
  }
  return "Impossible d’activer la vérification. Réessayez.";
}
