"use server";

import { countActiveSuperAdmins } from "@/lib/admin/super-admin-guards";
import {
  isValidTotpCode,
  logMfaChallengeDiagnostic,
  mapMfaChallengeAccessDenial,
  mapMfaChallengeError,
  mapVerifiedTotpFactorOptions,
  MFA_CHALLENGE_DEFAULT_NEXT,
  MFA_CHALLENGE_FACTOR_ABSENT_MESSAGE,
  resolveChallengeVerifiedFactorId,
  resolveMfaChallengeAccess,
  runMfaChallengeVerification,
} from "@/lib/auth/mfa-challenge";
import { sanitizeInternalNextPath } from "@/lib/auth/mfa-aal";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type MfaChallengeVerifyResult =
  | { ok: true; next: string }
  | { ok: false; error: string; code?: string };

/**
 * Challenge post-login via session SSR.
 * Aucun enroll / unenroll. OTP jamais loggé.
 */
export async function verifyMfaChallenge(options: {
  factorId: string;
  code: string;
  next?: string | null;
}): Promise<MfaChallengeVerifyResult> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const activeCount = await countActiveSuperAdmins();

  const next =
    sanitizeInternalNextPath(options.next) ?? MFA_CHALLENGE_DEFAULT_NEXT;

  const [aal, factors] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  if (factors.error) {
    logMfaChallengeDiagnostic("listFactors", factors.error);
    return {
      ok: false,
      error: mapMfaChallengeError(factors.error),
      code: "listFactors_failed",
    };
  }

  const verifiedFactors = mapVerifiedTotpFactorOptions(factors.data?.totp);
  const access = resolveMfaChallengeAccess({
    authenticated: Boolean(profile),
    role: profile?.role,
    accountStatus: profile?.accountStatus,
    activeSuperAdminCount: activeCount,
    currentLevel: aal.data?.currentLevel ?? null,
    verifiedFactors,
    requestedNext: next,
  });

  if (access.action === "redirect") {
    if (
      access.reason === "already_aal2" ||
      access.reason === "enforcement_disabled"
    ) {
      return { ok: true, next: access.to };
    }
    return {
      ok: false,
      error: mapMfaChallengeAccessDenial(access.reason),
      code: access.reason,
    };
  }

  if (!profile) {
    return {
      ok: false,
      error: mapMfaChallengeAccessDenial("unauthenticated"),
      code: "unauthenticated",
    };
  }

  const trimmed = options.code.trim();
  if (!isValidTotpCode(trimmed)) {
    return {
      ok: false,
      error: "Entrez le code à 6 chiffres affiché dans votre application.",
      code: "invalid_code",
    };
  }

  const resolved = resolveChallengeVerifiedFactorId(
    options.factorId,
    access.factors,
  );
  if (!resolved.ok) {
    return {
      ok: false,
      error: MFA_CHALLENGE_FACTOR_ABSENT_MESSAGE,
      code: resolved.code,
    };
  }

  try {
    await runMfaChallengeVerification({
      factorId: resolved.factorId,
      code: trimmed,
      challenge: (args) => supabase.auth.mfa.challenge(args),
      verify: (args) => supabase.auth.mfa.verify(args),
      refreshSession: () => supabase.auth.refreshSession(),
      getCurrentAal: async () => {
        const level =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        return level.data?.currentLevel;
      },
    });
  } catch (err) {
    const code =
      err &&
      typeof err === "object" &&
      "code" in err &&
      typeof (err as { code: unknown }).code === "string"
        ? (err as { code: string }).code
        : null;
    const step =
      code === "challenge_empty" ||
      (code != null && code.includes("challenge") && !code.includes("verif"))
        ? "challenge"
        : "verify";
    logMfaChallengeDiagnostic(step, err);
    return {
      ok: false,
      error: mapMfaChallengeError(err),
      code: code ?? "verify_failed",
    };
  }

  logMfaChallengeDiagnostic("verify", { code: "ok" });
  return { ok: true, next: access.next };
}
