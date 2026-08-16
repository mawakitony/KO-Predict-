"use server";

import { revalidatePath } from "next/cache";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import { countActiveSuperAdmins } from "@/lib/admin/super-admin-guards";
import {
  countVerifiedTotpFactors,
  extractAuthErrorCode,
  isValidTotpCode,
  logMfaSetupDiagnostic,
  mapMfaSetupError,
  mapTotpEnrollForDisplay,
  MFA_FACTOR_STALE_MESSAGE,
  resolveSetupChallengeFactorId,
  runMfaSetupActivation,
} from "@/lib/auth/mfa-setup";
import {
  assertCleanupNeverIncludesVerified,
  listUnverifiedFactorIdsForCleanup,
  mapAdditionalMfaFactorDenial,
  resolveAdditionalMfaFactorGate,
} from "@/lib/auth/mfa-security";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type AdditionalMfaEnrollmentPayload = {
  factorId: string;
  qrDataUrl: string;
  manualSecret: string;
};

export type AdditionalMfaActionOk = {
  ok: true;
} & AdditionalMfaEnrollmentPayload;

export type AdditionalMfaActionErr = {
  ok: false;
  error: string;
  code?: string;
};

export type AdditionalMfaEnrollmentResult =
  | AdditionalMfaActionOk
  | AdditionalMfaActionErr;

export type AdditionalMfaActivateResult =
  | { ok: true }
  | { ok: false; error: string; code?: string };

type GateOk = {
  ok: true;
  profileId: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
  verifiedCount: number;
};

async function assertAdditionalFactorAllowed(): Promise<
  GateOk | AdditionalMfaActionErr
> {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const activeCount = await countActiveSuperAdmins();

  const [aal, factors] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  if (factors.error) {
    logMfaSetupDiagnostic("listFactors", factors.error);
    return {
      ok: false,
      error: mapMfaSetupError(factors.error),
      code: "listFactors_failed",
    };
  }

  const verifiedCount = countVerifiedTotpFactors(factors.data?.totp);
  const gate = resolveAdditionalMfaFactorGate({
    authenticated: Boolean(profile),
    role: profile?.role,
    accountStatus: profile?.accountStatus,
    currentLevel: aal.data?.currentLevel ?? null,
    verifiedTotpFactorCount: verifiedCount,
    activeSuperAdminCount: activeCount,
  });

  if (gate.action === "deny") {
    return {
      ok: false,
      error: mapAdditionalMfaFactorDenial(gate.code),
      code: gate.code,
    };
  }

  if (!profile) {
    return {
      ok: false,
      error: mapAdditionalMfaFactorDenial("unauthenticated"),
      code: "unauthenticated",
    };
  }

  return {
    ok: true,
    profileId: profile.id,
    supabase,
    verifiedCount,
  };
}

/**
 * Unenroll uniquement les facteurs unverified (jamais verified).
 * Utilise listFactors().all — totp = verified only.
 */
async function cleanupUnverifiedFactors(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<AdditionalMfaActionErr | null> {
  const listed = await supabase.auth.mfa.listFactors();
  if (listed.error) {
    logMfaSetupDiagnostic("listFactors", listed.error);
    return {
      ok: false,
      error: mapMfaSetupError(listed.error),
      code: "listFactors_failed",
    };
  }

  const all = listed.data?.all ?? [];
  const toRemove = listUnverifiedFactorIdsForCleanup(all);
  if (!assertCleanupNeverIncludesVerified(toRemove, all)) {
    return {
      ok: false,
      error: "Nettoyage refusé : un facteur verified serait impacté.",
      code: "cleanup_guard",
    };
  }

  for (const id of toRemove) {
    const removed = await supabase.auth.mfa.unenroll({ factorId: id });
    if (removed.error) {
      logMfaSetupDiagnostic("restart", removed.error);
      return {
        ok: false,
        error: mapMfaSetupError(removed.error),
        code: "unenroll_failed",
      };
    }
  }

  return null;
}

async function enrollAdditionalTotpFactor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  verifiedCount: number,
): Promise<AdditionalMfaEnrollmentResult> {
  const enrolled = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: `KO Predict Authenticator ${verifiedCount + 1}`,
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
      error: "Impossible d’ajouter un facteur. Réessayez.",
      code: "enroll_empty",
    };
  }

  // QR / secret : réponse immédiate uniquement — jamais loggés.
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

/** Ajout d’un 2e+ facteur TOTP — session SSR + AAL2. */
export async function startAdditionalMfaFactor(): Promise<AdditionalMfaEnrollmentResult> {
  const gate = await assertAdditionalFactorAllowed();
  if (!gate.ok) return gate;

  const cleanupErr = await cleanupUnverifiedFactors(gate.supabase);
  if (cleanupErr) return cleanupErr;

  return enrollAdditionalTotpFactor(gate.supabase, gate.verifiedCount);
}

/**
 * Recommencer l’ajout : cleanup unverified (+ facteur courant s’il est unverified),
 * puis nouvel enroll. Ne touche jamais un verified.
 */
export async function restartAdditionalMfaFactor(options: {
  currentFactorId?: string | null;
}): Promise<AdditionalMfaEnrollmentResult> {
  const gate = await assertAdditionalFactorAllowed();
  if (!gate.ok) return gate;

  const listed = await gate.supabase.auth.mfa.listFactors();
  if (listed.error) {
    logMfaSetupDiagnostic("listFactors", listed.error);
    return {
      ok: false,
      error: mapMfaSetupError(listed.error),
      code: "listFactors_failed",
    };
  }

  const all = listed.data?.all ?? [];
  const currentId = options.currentFactorId?.trim() || null;
  const toRemove = new Set(listUnverifiedFactorIdsForCleanup(all));
  if (currentId) {
    const match = all.find((f) => f.id === currentId);
    if (match && match.status !== "verified") {
      toRemove.add(currentId);
    }
  }

  const cleanupIds = [...toRemove];
  if (!assertCleanupNeverIncludesVerified(cleanupIds, all)) {
    return {
      ok: false,
      error: "Nettoyage refusé : un facteur verified serait impacté.",
      code: "cleanup_guard",
    };
  }

  for (const id of cleanupIds) {
    const removed = await gate.supabase.auth.mfa.unenroll({ factorId: id });
    if (removed.error) {
      logMfaSetupDiagnostic("restart", removed.error);
      return {
        ok: false,
        error: mapMfaSetupError(removed.error),
        code: "unenroll_failed",
      };
    }
  }

  return enrollAdditionalTotpFactor(gate.supabase, gate.verifiedCount);
}

/**
 * challenge + verify + refresh + AAL2 pour le nouveau facteur.
 * Audit MFA_FACTOR_ADDED (factor_id uniquement).
 */
export async function activateAdditionalMfaFactor(options: {
  factorId: string;
  code: string;
}): Promise<AdditionalMfaActivateResult> {
  const gate = await assertAdditionalFactorAllowed();
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

  // Sécurité : le factorId activé ne doit pas être un verified déjà présent.
  const listed = await gate.supabase.auth.mfa.listFactors();
  if (!listed.error) {
    const existingVerified = (listed.data?.all ?? []).find(
      (f) => f.id === resolved.factorId && f.status === "verified",
    );
    if (existingVerified) {
      return {
        ok: false,
        error: "Ce facteur est déjà actif.",
        code: "already_verified",
      };
    }
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
    logMfaSetupDiagnostic("verify", err);
    return {
      ok: false,
      error: mapMfaSetupError(err),
      code: extractAuthErrorCode(err) ?? "activate_failed",
    };
  }

  await recordAccessAudit({
    eventType: "MFA_FACTOR_ADDED",
    authUserId: gate.profileId,
    actorId: gate.profileId,
    meta: { factor_id: resolved.factorId },
  });

  revalidatePath("/account/security");
  logMfaSetupDiagnostic("verify", { code: "ok" });
  return { ok: true };
}
