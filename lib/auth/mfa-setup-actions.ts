"use server";

import { recordAccessAudit } from "@/lib/auth/access-audit";
import { countActiveSuperAdmins } from "@/lib/admin/super-admin-guards";
import {
  countVerifiedTotpFactors,
  extractAuthErrorCode,
  isValidTotpCode,
  logMfaSetupDiagnostic,
  mapMfaSetupAccessDenial,
  mapMfaSetupError,
  mapTotpEnrollForDisplay,
  MFA_FACTOR_STALE_MESSAGE,
  resolveMfaSetupAccess,
  resolveSetupChallengeFactorId,
  runMfaSetupActivation,
} from "@/lib/auth/mfa-setup";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type MfaSetupEnrollmentPayload = {
  factorId: string;
  qrDataUrl: string;
  manualSecret: string;
};

export type MfaSetupActionOk = {
  ok: true;
} & MfaSetupEnrollmentPayload;

export type MfaSetupActionErr = {
  ok: false;
  error: string;
  code?: string;
};

export type MfaSetupEnrollmentResult = MfaSetupActionOk | MfaSetupActionErr;

export type MfaSetupActivateResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

async function assertSetupEnrollmentAllowed(): Promise<
  | { ok: true; profileId: string; supabase: Awaited<ReturnType<typeof createClient>> }
  | MfaSetupActionErr
> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const activeCount = await countActiveSuperAdmins();

  const factors = await supabase.auth.mfa.listFactors();
  if (factors.error) {
    logMfaSetupDiagnostic("listFactors", factors.error);
    return {
      ok: false,
      error: mapMfaSetupError(factors.error),
      code: "listFactors_failed",
    };
  }

  // listFactors().totp = verified only — correct pour already_verified.
  const verifiedCount = countVerifiedTotpFactors(factors.data?.totp);
  const access = resolveMfaSetupAccess({
    authenticated: Boolean(profile),
    role: profile?.role,
    accountStatus: profile?.accountStatus,
    activeSuperAdminCount: activeCount,
    verifiedTotpFactorCount: verifiedCount,
  });

  if (access.action === "redirect") {
    return {
      ok: false,
      error: mapMfaSetupAccessDenial(access.reason),
      code: access.reason,
    };
  }

  if (!profile) {
    return {
      ok: false,
      error: mapMfaSetupAccessDenial("unauthenticated"),
      code: "unauthenticated",
    };
  }

  return { ok: true, profileId: profile.id, supabase };
}

async function enrollTotpFactor(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<MfaSetupEnrollmentResult> {
  const enrolled = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `KO Predict Authenticator ${Date.now()}`,
  });

  if (enrolled.error) {
    logMfaSetupDiagnostic("enroll", enrolled.error);
    return {
      ok: false,
      error: mapMfaSetupError(enrolled.error),
      code: "enroll_failed",
    };
  }

  if (!enrolled.data?.id || !enrolled.data.totp) {
    logMfaSetupDiagnostic("enroll", { code: "enroll_empty" });
    return {
      ok: false,
      error: "Impossible d’activer la vérification. Réessayez.",
      code: "enroll_empty",
    };
  }

  // QR / secret : transit réponse immédiate uniquement — jamais loggés ici.
  const display = mapTotpEnrollForDisplay({
    id: enrolled.data.id,
    totp: {
      qr_code: enrolled.data.totp.qr_code,
      secret: enrolled.data.totp.secret,
    },
  });

  logMfaSetupDiagnostic("enroll", { code: "ok" });
  return { ok: true, ...display };
}

/** Enroll TOTP via session SSR — pas de cleanup auto. */
export async function startMfaEnrollment(): Promise<MfaSetupEnrollmentResult> {
  const gate = await assertSetupEnrollmentAllowed();
  if (!gate.ok) return gate;
  return enrollTotpFactor(gate.supabase);
}

/**
 * Recommencer : unenroll uniquement le facteur unverified courant (si fourni),
 * puis nouvel enroll SSR.
 */
export async function restartMfaEnrollment(options: {
  currentFactorId?: string | null;
}): Promise<MfaSetupEnrollmentResult> {
  const gate = await assertSetupEnrollmentAllowed();
  if (!gate.ok) return gate;

  const currentId = options.currentFactorId?.trim() || null;
  if (currentId) {
    const listed = await gate.supabase.auth.mfa.listFactors();
    if (listed.error) {
      logMfaSetupDiagnostic("listFactors", listed.error);
      return {
        ok: false,
        error: mapMfaSetupError(listed.error),
        code: "listFactors_failed",
      };
    }

    const match = (listed.data?.all ?? []).find((f) => f.id === currentId);
    if (match && match.status !== "verified") {
      const removed = await gate.supabase.auth.mfa.unenroll({
        factorId: currentId,
      });
      if (removed.error) {
        logMfaSetupDiagnostic("restart", removed.error);
        return {
          ok: false,
          error: mapMfaSetupError(removed.error),
          code: "unenroll_failed",
        };
      }
    }
  }

  logMfaSetupDiagnostic("restart", { code: "ok" });
  return enrollTotpFactor(gate.supabase);
}

/**
 * challenge + verify + refresh + AAL2 via session SSR.
 * Audit : factor_id uniquement (jamais secret/QR/OTP).
 */
export async function activateMfaEnrollment(options: {
  factorId: string;
  code: string;
}): Promise<MfaSetupActivateResult> {
  const gate = await assertSetupEnrollmentAllowed();
  if (!gate.ok) {
    return { ok: false, error: gate.error, code: gate.code };
  }

  const trimmed = options.code.trim();
  if (!isValidTotpCode(trimmed)) {
    return {
      ok: false,
      error: "Entrez le code à 6 chiffres affiché dans votre application.",
      code: "invalid_code",
    };
  }

  const resolved = resolveSetupChallengeFactorId(options.factorId);
  if (!resolved.ok) {
    return {
      ok: false,
      error: MFA_FACTOR_STALE_MESSAGE,
      code: resolved.code,
    };
  }

  try {
    await runMfaSetupActivation({
      factorId: resolved.factorId,
      code: trimmed,
      challenge: (args) => gate.supabase.auth.mfa.challenge(args),
      verify: (args) => gate.supabase.auth.mfa.verify(args),
      refreshSession: () => gate.supabase.auth.refreshSession(),
      getCurrentAal: async () => {
        const aal =
          await gate.supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        return aal.data?.currentLevel;
      },
    });
  } catch (err) {
    const step =
      extractAuthErrorCode(err) === "aal_incomplete"
        ? "verify"
        : err &&
            typeof err === "object" &&
            "code" in err &&
            String((err as { code: unknown }).code).includes("challenge")
          ? "challenge"
          : "verify";
    logMfaSetupDiagnostic(step === "challenge" ? "challenge" : "verify", err);
    return {
      ok: false,
      error: mapMfaSetupError(err),
      code: extractAuthErrorCode(err) ?? "activate_failed",
    };
  }

  await recordAccessAudit({
    eventType: "MFA_ENROLLED",
    authUserId: gate.profileId,
    actorId: gate.profileId,
    meta: { factor_id: resolved.factorId },
  });

  logMfaSetupDiagnostic("verify", { code: "ok" });
  return { ok: true };
}
