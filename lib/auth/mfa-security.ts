/**
 * /account/security — logique pure, sans secrets / OTP / QR.
 */

import type { UserRole } from "@/types/student";
import { homePathForRole } from "@/lib/auth/roles";
import { buildMfaChallengeHref } from "@/lib/auth/mfa-aal";
import type { MfaChallengeFactorOption } from "@/lib/auth/mfa-challenge";

export type AccountSecurityAccessDecision =
  | { action: "allow" }
  | {
      action: "redirect";
      to: string;
      reason:
        | "unauthenticated"
        | "disabled"
        | "pending"
        | "not_super_admin"
        | "needs_setup"
        | "needs_challenge";
    };

/**
 * Accès page sécurité : super_admin ACTIVE + AAL2 uniquement.
 * Indépendant du count SA (gestion des facteurs toujours AAL2).
 */
export function resolveAccountSecurityAccess(options: {
  authenticated: boolean;
  role: UserRole | null | undefined;
  accountStatus: string | null | undefined;
  currentLevel: string | null | undefined;
  verifiedTotpFactorCount: number;
}): AccountSecurityAccessDecision {
  if (!options.authenticated) {
    return {
      action: "redirect",
      to: "/login?next=%2Faccount%2Fsecurity",
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

  const verified = Math.max(0, options.verifiedTotpFactorCount | 0);
  if (verified === 0) {
    return {
      action: "redirect",
      to: "/auth/mfa/setup",
      reason: "needs_setup",
    };
  }

  if (options.currentLevel !== "aal2") {
    return {
      action: "redirect",
      to: buildMfaChallengeHref("/account/security"),
      reason: "needs_challenge",
    };
  }

  return { action: "allow" };
}

/** Suppression self-service interdite s’il ne resterait aucun verified. */
export function canRemoveVerifiedTotpFactor(verifiedCount: number): boolean {
  return Number.isFinite(verifiedCount) && verifiedCount >= 2;
}

export function isRemovableSecondaryFactor(options: {
  factorId: string;
  verifiedFactors: MfaChallengeFactorOption[];
}): boolean {
  if (!canRemoveVerifiedTotpFactor(options.verifiedFactors.length)) {
    return false;
  }
  return options.verifiedFactors.some((f) => f.id === options.factorId);
}

/** Prep enroll d’un facteur supplémentaire : cleanup unverified seulement. */
export function resolveAdditionalTotpEnrollPrep(
  factors:
    | Array<{ id: string; status: string }>
    | null
    | undefined,
): { unverifiedIdsToRemove: string[] } {
  if (!factors?.length) return { unverifiedIdsToRemove: [] };
  return {
    unverifiedIdsToRemove: factors
      .filter((f) => f.status !== "verified" && Boolean(f.id))
      .map((f) => f.id),
  };
}

export function mfaStatusLabel(verifiedCount: number): "Activé" | "Non activé" {
  return verifiedCount > 0 ? "Activé" : "Non activé";
}
