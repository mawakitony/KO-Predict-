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

/** IDs des facteurs TOTP non vérifiés à retirer avant un nouvel enroll. */
export function listUnverifiedTotpFactorIds(
  factors: MfaTotpFactorLite[] | null | undefined,
): string[] {
  if (!factors?.length) return [];
  return factors
    .filter((f) => f.status !== "verified" && Boolean(f.id))
    .map((f) => f.id);
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

/** Après listFactors : verified → stop ; sinon cleanup des unverified puis enroll. */
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
    unverifiedIdsToRemove: listUnverifiedTotpFactorIds(factors),
  };
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

export function mapMfaSetupError(error: unknown): string {
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
    lower.includes("code")
  ) {
    return "Code incorrect. Vérifiez l’application d’authentification et réessayez.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Erreur réseau. Vérifiez votre connexion et réessayez.";
  }
  if (lower.includes("session") || lower.includes("auth")) {
    return "Session expirée. Reconnectez-vous puis recommencez.";
  }
  return "Impossible d’activer la vérification. Réessayez.";
}
