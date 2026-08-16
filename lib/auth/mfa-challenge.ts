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

/** Challenge post-login : factorId doit être un TOTP verified du user. */
export function resolveChallengeVerifiedFactorId(
  factorId: string | null | undefined,
  verifiedFactors: MfaChallengeFactorOption[],
):
  | { ok: true; factorId: string }
  | { ok: false; code: "factor_missing" | "factor_not_verified" } {
  const id = factorId?.trim() ?? "";
  if (!id) return { ok: false, code: "factor_missing" };
  if (!isAllowedChallengeFactorId(id, verifiedFactors)) {
    return { ok: false, code: "factor_not_verified" };
  }
  return { ok: true, factorId: id };
}

export const MFA_CHALLENGE_FACTOR_ABSENT_MESSAGE =
  "Facteur d’authentification introuvable ou non actif. Reconnectez-vous puis réessayez.";

export function mapMfaChallengeAccessDenial(
  reason: Exclude<
    MfaChallengeAccessDecision,
    { action: "allow_challenge" }
  >["reason"],
): string {
  switch (reason) {
    case "unauthenticated":
      return "Session expirée. Reconnectez-vous puis réessayez.";
    case "disabled":
      return "Votre accès KO Predict™ a été désactivé.";
    case "pending":
      return "Compte non finalisé. Utilisez Première connexion.";
    case "not_super_admin":
      return "Accès réservé aux super administrateurs.";
    case "enforcement_disabled":
      return "La vérification en deux étapes n’est pas requise pour le moment.";
    case "no_verified_factor":
      return "Aucun facteur d’authentification actif. Configurez la MFA.";
    case "already_aal2":
      return "Vérification déjà effectuée.";
    default:
      return "Vérification impossible. Réessayez.";
  }
}

function extractChallengeErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  if ("code" in error && typeof (error as { code: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return null;
}

function extractChallengeErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  if ("status" in error) {
    const status = Number((error as { status: unknown }).status);
    return Number.isFinite(status) ? status : null;
  }
  return null;
}

/**
 * Diagnostic challenge serveur — step / code / status uniquement.
 * Jamais OTP, secret, QR, URI, token, cookie.
 */
export function logMfaChallengeDiagnostic(
  step: "challenge" | "verify" | "listFactors",
  error?: unknown,
): void {
  console.info("[mfa-challenge]", {
    step,
    code: extractChallengeErrorCode(error ?? null),
    status: extractChallengeErrorStatus(error ?? null),
  });
}

/**
 * Challenge post-login : challenge → verify → refresh → AAL2.
 * Aucun enroll / unenroll. factorId déjà validé (verified).
 */
export async function runMfaChallengeVerification(options: {
  factorId: string;
  code: string;
  challenge: (args: {
    factorId: string;
  }) => Promise<{ data: { id: string } | null; error: unknown }>;
  verify: (args: {
    factorId: string;
    challengeId: string;
    code: string;
  }) => Promise<{ error: unknown }>;
  refreshSession: () => Promise<unknown>;
  getCurrentAal: () => Promise<string | null | undefined>;
}): Promise<"ok_aal2"> {
  const challenge = await options.challenge({ factorId: options.factorId });
  if (challenge.error) throw challenge.error;
  if (!challenge.data?.id) {
    throw {
      name: "MfaStepError",
      message: "challenge_empty",
      code: "challenge_empty",
    };
  }

  const verified = await options.verify({
    factorId: options.factorId,
    challengeId: challenge.data.id,
    code: options.code,
  });
  if (verified.error) throw verified.error;

  await options.refreshSession();
  const level = await options.getCurrentAal();
  if (resolveTotpVerifyOutcome(level) !== "ok_aal2") {
    throw {
      name: "MfaAalIncompleteError",
      message: "aal_incomplete",
      code: "aal_incomplete",
    };
  }
  return "ok_aal2";
}

export function mapMfaChallengeError(error: unknown): string {
  const code = extractChallengeErrorCode(error);
  if (code === "mfa_verification_failed") {
    return "Code incorrect. Vérifiez l’application d’authentification et réessayez.";
  }
  if (code === "mfa_challenge_expired") {
    return "Le défi a expiré. Entrez un nouveau code et réessayez.";
  }
  if (
    code === "mfa_factor_not_found" ||
    code === "factor_missing" ||
    code === "factor_not_verified"
  ) {
    return MFA_CHALLENGE_FACTOR_ABSENT_MESSAGE;
  }
  if (code === "aal_incomplete") {
    return "Vérification incomplète. Entrez un nouveau code et réessayez.";
  }
  if (code === "challenge_empty") {
    return "Vérification impossible. Réessayez.";
  }

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
    lower.includes("totp") ||
    (lower.includes("code") && !lower.includes("encode"))
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
