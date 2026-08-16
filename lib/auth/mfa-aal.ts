/**
 * Helpers MFA / AAL — logique pure (testable).
 * Aucun secret TOTP / QR / OTP ici.
 */

export type AuthenticatorAssuranceLevel = "aal1" | "aal2";

export type SuperAdminMfaDecision =
  | { action: "allow"; reason: "aal2_ok" | "enforcement_disabled" }
  | {
      action: "redirect";
      to: "/auth/mfa/setup" | "/auth/mfa/challenge";
      reason: "no_verified_factor" | "aal1_needs_challenge";
      next?: string;
    };

export const MFA_SETUP_PATH = "/auth/mfa/setup" as const;
export const MFA_CHALLENGE_PATH = "/auth/mfa/challenge" as const;
export const SUPER_ADMIN_MFA_MIN_ACTIVE = 2;
/** Code stable API — jamais d’OTP / secret associé. */
export const MFA_AAL2_REQUIRED = "MFA_AAL2_REQUIRED" as const;

export type SuperAdminMfaApiDecision =
  | { action: "allow"; reason: "not_super_admin" | "enforcement_disabled" | "aal2_ok" }
  | { action: "forbid"; reasonCode: typeof MFA_AAL2_REQUIRED };

export function normalizeAalLevel(
  value: string | null | undefined,
): AuthenticatorAssuranceLevel | null {
  if (value === "aal1" || value === "aal2") return value;
  return null;
}

/**
 * Chemin interne sûr pour `?next=` — refuse open redirects.
 * Retourne null si invalide (caller fournit le fallback).
 */
export function sanitizeInternalNextPath(
  nextPath?: string | null,
  options?: { allowMfaPaths?: boolean },
): string | null {
  if (!nextPath) return null;
  const trimmed = nextPath.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\") || trimmed.includes("://")) return null;
  if (/[\x00-\x1f\x7f]/.test(trimmed)) return null;
  if (!options?.allowMfaPaths && trimmed.startsWith("/auth/mfa/")) return null;
  return trimmed;
}

/** Enforcement MFA super_admin uniquement si assez de SA ACTIVE. */
export function isSuperAdminMfaEnforcementEnabled(
  activeSuperAdminCount: number,
  min = SUPER_ADMIN_MFA_MIN_ACTIVE,
): boolean {
  return (
    Number.isFinite(activeSuperAdminCount) && activeSuperAdminCount >= min
  );
}

/**
 * Décide si un super_admin ACTIVE peut continuer, ou doit setup/challenge.
 * Ne gère pas DISABLED / PENDING / non-super_admin (à filtrer avant).
 */
export function resolveSuperAdminMfaGate(options: {
  activeSuperAdminCount: number;
  currentLevel: string | null | undefined;
  nextLevel: string | null | undefined;
  verifiedTotpFactorCount: number;
  /** Destination post-challenge (ex. /admin/team). */
  nextPath?: string | null;
  minActiveSuperAdmins?: number;
}): SuperAdminMfaDecision {
  const min = options.minActiveSuperAdmins ?? SUPER_ADMIN_MFA_MIN_ACTIVE;

  if (!isSuperAdminMfaEnforcementEnabled(options.activeSuperAdminCount, min)) {
    return { action: "allow", reason: "enforcement_disabled" };
  }

  const verified = Math.max(0, options.verifiedTotpFactorCount | 0);
  if (verified === 0) {
    return {
      action: "redirect",
      to: MFA_SETUP_PATH,
      reason: "no_verified_factor",
    };
  }

  const current = normalizeAalLevel(options.currentLevel) ?? "aal1";
  if (current === "aal2") {
    return { action: "allow", reason: "aal2_ok" };
  }

  const next = sanitizeInternalNextPath(options.nextPath) ?? undefined;

  return {
    action: "redirect",
    to: MFA_CHALLENGE_PATH,
    reason: "aal1_needs_challenge",
    next,
  };
}

/** Construit l’URL challenge avec `next` sûr. */
export function buildMfaChallengeHref(nextPath?: string | null): string {
  const next = sanitizeInternalNextPath(nextPath);
  if (next) {
    return `${MFA_CHALLENGE_PATH}?next=${encodeURIComponent(next)}`;
  }
  return MFA_CHALLENGE_PATH;
}

/**
 * Après login password (AAL1) pour un super_admin ACTIVE.
 * Retourne un chemin de redirection MFA, ou null si pas d’enforcement / déjà AAL2.
 */
export function resolveSuperAdminPostLoginMfaPath(options: {
  activeSuperAdminCount: number;
  currentLevel: string | null | undefined;
  verifiedTotpFactorCount: number;
  intendedDestination?: string | null;
  minActiveSuperAdmins?: number;
}): string | null {
  const decision = resolveSuperAdminMfaGate({
    activeSuperAdminCount: options.activeSuperAdminCount,
    currentLevel: options.currentLevel,
    nextLevel: options.verifiedTotpFactorCount > 0 ? "aal2" : "aal1",
    verifiedTotpFactorCount: options.verifiedTotpFactorCount,
    nextPath: options.intendedDestination,
    minActiveSuperAdmins: options.minActiveSuperAdmins,
  });

  if (decision.action === "allow") return null;
  if (decision.to === MFA_SETUP_PATH) return MFA_SETUP_PATH;
  return buildMfaChallengeHref(decision.next);
}

/**
 * Guard API : super_admin uniquement.
 * Non-SA / count < 2 → allow. Sinon AAL2 obligatoire (pas de redirect HTML).
 */
export function resolveSuperAdminMfaApiGate(options: {
  role: string | null | undefined;
  activeSuperAdminCount: number;
  currentLevel: string | null | undefined;
  minActiveSuperAdmins?: number;
}): SuperAdminMfaApiDecision {
  if (options.role !== "super_admin") {
    return { action: "allow", reason: "not_super_admin" };
  }

  const min = options.minActiveSuperAdmins ?? SUPER_ADMIN_MFA_MIN_ACTIVE;
  if (!isSuperAdminMfaEnforcementEnabled(options.activeSuperAdminCount, min)) {
    return { action: "allow", reason: "enforcement_disabled" };
  }

  const current = normalizeAalLevel(options.currentLevel) ?? "aal1";
  if (current === "aal2") {
    return { action: "allow", reason: "aal2_ok" };
  }

  return { action: "forbid", reasonCode: MFA_AAL2_REQUIRED };
}
