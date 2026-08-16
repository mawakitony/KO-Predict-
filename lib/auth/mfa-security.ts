/**
 * /account/security — logique pure, sans secrets / OTP / QR.
 */

import type { UserRole } from "@/types/student";
import { homePathForRole } from "@/lib/auth/roles";
import {
  buildMfaChallengeHref,
  isSuperAdminMfaEnforcementEnabled,
  SUPER_ADMIN_MFA_MIN_ACTIVE,
} from "@/lib/auth/mfa-aal";
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

/** Gate pure pour ajout d’un facteur supplémentaire (Phase H). */
export type AdditionalMfaFactorGateDecision =
  | { action: "allow" }
  | {
      action: "deny";
      code:
        | "unauthenticated"
        | "disabled"
        | "pending"
        | "not_super_admin"
        | "enforcement_disabled"
        | "needs_setup"
        | "aal1_required"
        | "aal2_required";
    };

export function resolveAdditionalMfaFactorGate(options: {
  authenticated: boolean;
  role: UserRole | null | undefined;
  accountStatus: string | null | undefined;
  currentLevel: string | null | undefined;
  verifiedTotpFactorCount: number;
  activeSuperAdminCount: number;
  minActiveSuperAdmins?: number;
}): AdditionalMfaFactorGateDecision {
  const access = resolveAccountSecurityAccess({
    authenticated: options.authenticated,
    role: options.role,
    accountStatus: options.accountStatus,
    currentLevel: options.currentLevel,
    verifiedTotpFactorCount: options.verifiedTotpFactorCount,
  });

  if (access.action === "redirect") {
    const code =
      access.reason === "needs_challenge"
        ? "aal2_required"
        : access.reason === "needs_setup"
          ? "needs_setup"
          : access.reason;
    return { action: "deny", code };
  }

  const min = options.minActiveSuperAdmins ?? SUPER_ADMIN_MFA_MIN_ACTIVE;
  if (!isSuperAdminMfaEnforcementEnabled(options.activeSuperAdminCount, min)) {
    return { action: "deny", code: "enforcement_disabled" };
  }

  return { action: "allow" };
}

export function mapAdditionalMfaFactorDenial(
  code: Extract<AdditionalMfaFactorGateDecision, { action: "deny" }>["code"],
): string {
  switch (code) {
    case "unauthenticated":
      return "Session expirée. Reconnectez-vous puis réessayez.";
    case "disabled":
      return "Votre accès KO Predict™ a été désactivé.";
    case "pending":
      return "Compte non finalisé.";
    case "not_super_admin":
      return "Accès réservé aux super administrateurs.";
    case "enforcement_disabled":
      return "La vérification en deux étapes n’est pas requise pour le moment.";
    case "needs_setup":
      return "Configurez d’abord un premier facteur MFA.";
    case "aal1_required":
    case "aal2_required":
      return "Vérification en deux étapes requise (AAL2).";
    default:
      return "Impossible d’ajouter un facteur. Réessayez.";
  }
}

/**
 * IDs unverified à retirer avant un nouvel enroll additionnel.
 * Ne retourne jamais un id verified.
 */
export function listUnverifiedFactorIdsForCleanup(
  factors:
    | Array<{ id: string; status: string }>
    | null
    | undefined,
): string[] {
  return resolveAdditionalTotpEnrollPrep(factors).unverifiedIdsToRemove;
}

/** Garantit qu’aucun verified n’est dans la liste de cleanup. */
export function assertCleanupNeverIncludesVerified(
  cleanupIds: string[],
  factors: Array<{ id: string; status: string }> | null | undefined,
): boolean {
  if (!cleanupIds.length) return true;
  const verifiedIds = new Set(
    (factors ?? []).filter((f) => f.status === "verified").map((f) => f.id),
  );
  return cleanupIds.every((id) => !verifiedIds.has(id));
}
