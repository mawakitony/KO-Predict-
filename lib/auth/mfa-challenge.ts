/**
 * Accès /auth/mfa/challenge — logique pure, sans secrets / OTP.
 */

import type { UserRole } from "@/types/student";
import {
  isSuperAdminMfaEnforcementEnabled,
  sanitizeInternalNextPath,
  SUPER_ADMIN_MFA_MIN_ACTIVE,
} from "@/lib/auth/mfa-aal";
import { homePathForRole } from "@/lib/auth/roles";
import { isValidTotpCode, resolveTotpVerifyOutcome } from "@/lib/auth/mfa-setup";

export { isValidTotpCode, resolveTotpVerifyOutcome };

export const MFA_CHALLENGE_ERROR_COOLDOWN_MS = 2000;
export const MFA_CHALLENGE_DEFAULT_NEXT = "/admin";

export interface MfaChallengeFactorOption {
  id: string;
  label: string;
}

export type MfaChallengeAccessDecision =
  | {
      action: "allow_challenge";
      factors: MfaChallengeFactorOption[];
      next: string;
    }
  | {
      action: "redirect";
      to: string;
      reason:
        | "unauthenticated"
        | "disabled"
        | "pending"
        | "not_super_admin"
        | "enforcement_disabled"
        | "no_verified_factor"
        | "already_aal2";
    };

export function resolveMfaChallengeAccess(options: {
  authenticated: boolean;
  role: UserRole | null | undefined;
  accountStatus: string | null | undefined;
  activeSuperAdminCount: number;
  currentLevel: string | null | undefined;
  verifiedFactors: MfaChallengeFactorOption[];
  requestedNext?: string | null;
  minActiveSuperAdmins?: number;
}): MfaChallengeAccessDecision {
  const next =
    sanitizeInternalNextPath(options.requestedNext) ??
    MFA_CHALLENGE_DEFAULT_NEXT;

  if (!options.authenticated) {
    return {
      action: "redirect",
      to: `/login?next=${encodeURIComponent("/auth/mfa/challenge")}`,
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
      to: next,
      reason: "enforcement_disabled",
    };
  }

  if (options.verifiedFactors.length === 0) {
    return {
      action: "redirect",
      to: "/auth/mfa/setup",
      reason: "no_verified_factor",
    };
  }

  if (options.currentLevel === "aal2") {
    return { action: "redirect", to: next, reason: "already_aal2" };
  }

  return {
    action: "allow_challenge",
    factors: options.verifiedFactors,
    next,
  };
}

/** Uniquement facteurs verified — labels non sensibles. */
export function mapVerifiedTotpFactorOptions(
  factors:
    | Array<{
        id: string;
        status: string;
        friendly_name?: string | null;
      }>
    | null
    | undefined,
): MfaChallengeFactorOption[] {
  if (!factors?.length) return [];
  return factors
    .filter((f) => f.status === "verified" && Boolean(f.id))
    .map((f, index) => {
      const name = f.friendly_name?.trim();
      return {
        id: f.id,
        label: name || `Application d’authentification ${index + 1}`,
      };
    });
}

export function pickDefaultChallengeFactorId(
  factors: MfaChallengeFactorOption[],
): string | null {
  return factors[0]?.id ?? null;
}

export function isAllowedChallengeFactorId(
  factorId: string,
  factors: MfaChallengeFactorOption[],
): boolean {
  return factors.some((f) => f.id === factorId);
}

export function mapMfaChallengeError(error: unknown): string {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : "";

  const lower = message.toLowerCase();
  if (lower.includes("expired") || lower.includes("timeout")) {
    return "Le défi a expiré. Entrez un nouveau code et réessayez.";
  }
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
    return "Session expirée. Reconnectez-vous puis réessayez.";
  }
  return "Vérification impossible. Réessayez.";
}
