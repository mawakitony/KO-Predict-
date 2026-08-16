"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { recordAccessAudit } from "@/lib/auth/access-audit";
import { buildMfaChallengeHref } from "@/lib/auth/mfa-aal";
import { mapVerifiedTotpFactorOptions } from "@/lib/auth/mfa-challenge";
import {
  canRemoveVerifiedTotpFactor,
  isRemovableSecondaryFactor,
  resolveAccountSecurityAccess,
} from "@/lib/auth/mfa-security";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type MfaSecurityActionState = {
  error: string | null;
  ok?: boolean;
};

async function loadSecurityContext() {
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  const [aal, factors] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);
  const verified = mapVerifiedTotpFactorOptions(factors.data?.totp);
  const access = resolveAccountSecurityAccess({
    authenticated: Boolean(profile),
    role: profile?.role,
    accountStatus: profile?.accountStatus,
    currentLevel: aal.data?.currentLevel ?? null,
    verifiedTotpFactorCount: verified.length,
  });
  return { profile, supabase, verified, access };
}

/**
 * Audit MFA — meta limitée à factor_id (jamais de matériel d’enrôlement).
 * Appelé après verify enroll réussi (setup ou 2e facteur).
 */
export async function recordMfaSecurityAuditAction(options: {
  eventType: "MFA_ENROLLED" | "MFA_FACTOR_ADDED" | "MFA_FACTOR_REMOVED";
  factorId?: string | null;
}): Promise<MfaSecurityActionState> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") {
    return { error: "Accès refusé." };
  }

  const supabase = await createClient();
  const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal.data?.currentLevel !== "aal2") {
    return { error: "Vérification en deux étapes requise." };
  }

  await recordAccessAudit({
    eventType: options.eventType,
    authUserId: profile.id,
    actorId: profile.id,
    meta: options.factorId ? { factor_id: options.factorId } : {},
  });

  return { error: null, ok: true };
}

export async function removeMfaFactorAction(
  _prev: MfaSecurityActionState,
  formData: FormData,
): Promise<MfaSecurityActionState> {
  const factorId = String(formData.get("factorId") ?? "").trim();
  if (!factorId) {
    return { error: "Facteur invalide." };
  }

  const { profile, supabase, verified, access } = await loadSecurityContext();
  if (access.action === "redirect" || !profile) {
    return { error: "Vérification en deux étapes requise." };
  }

  if (!canRemoveVerifiedTotpFactor(verified.length)) {
    return {
      error:
        "Impossible de supprimer le dernier facteur. Ajoutez-en un autre d’abord.",
    };
  }

  if (!isRemovableSecondaryFactor({ factorId, verifiedFactors: verified })) {
    return { error: "Ce facteur ne peut pas être supprimé." };
  }

  const removed = await supabase.auth.mfa.unenroll({ factorId });
  if (removed.error) {
    return { error: "Suppression impossible. Réessayez." };
  }

  await recordAccessAudit({
    eventType: "MFA_FACTOR_REMOVED",
    authUserId: profile.id,
    actorId: profile.id,
    meta: { factor_id: factorId },
  });

  revalidatePath("/account/security");
  return { error: null, ok: true };
}

/** Déconnecte toutes les sessions Auth (scope global). */
export async function signOutAllDevicesAction(): Promise<void> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "super_admin") {
    redirect("/login");
  }

  const supabase = await createClient();
  const [aal, factors] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  if (aal.data?.currentLevel !== "aal2") {
    const verified = (factors.data?.totp ?? []).filter(
      (f) => f.status === "verified",
    ).length;
    if (verified === 0) {
      redirect("/auth/mfa/setup");
    }
    redirect(buildMfaChallengeHref("/account/security"));
  }

  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
