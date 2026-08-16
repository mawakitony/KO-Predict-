import "server-only";

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { countActiveSuperAdmins } from "@/lib/admin/super-admin-guards";
import {
  buildMfaChallengeHref,
  MFA_AAL2_REQUIRED,
  resolveSuperAdminMfaApiGate,
  resolveSuperAdminMfaGate,
} from "@/lib/auth/mfa-aal";
import {
  requireSuperAdmin,
  type AuthProfile,
} from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/student";

async function getVerifiedTotpFactorCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return 0;
  return (data.totp ?? []).filter((f) => f.status === "verified").length;
}

async function getSessionAalLevels(): Promise<{
  currentLevel: string | null;
  nextLevel: string | null;
}> {
  const supabase = await createClient();
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) {
    return { currentLevel: null, nextLevel: null };
  }
  return {
    currentLevel: data.currentLevel ?? null,
    nextLevel: data.nextLevel ?? null,
  };
}

/**
 * Enforcement pages /admin : SA seulement, si count ACTIVE >= 2.
 * Non-SA → no-op. MFA routes hors /admin non concernées.
 */
export async function enforceSuperAdminMfaInAdminArea(
  profile: AuthProfile,
  options?: { next?: string },
): Promise<void> {
  if (profile.role !== "super_admin") return;

  const activeCount = await countActiveSuperAdmins();
  const verifiedTotpFactorCount = await getVerifiedTotpFactorCount();
  const { currentLevel, nextLevel } = await getSessionAalLevels();
  const nextPath = options?.next ?? "/admin";

  const decision = resolveSuperAdminMfaGate({
    activeSuperAdminCount: activeCount,
    currentLevel,
    nextLevel,
    verifiedTotpFactorCount,
    nextPath,
  });

  if (decision.action === "allow") return;

  if (decision.to === "/auth/mfa/setup") {
    redirect("/auth/mfa/setup");
  }
  redirect(buildMfaChallengeHref(decision.next ?? nextPath));
}

/**
 * Guard super_admin + AAL2 (pages réservées SA).
 */
export async function requireSuperAdminAal2(options?: {
  next?: string;
}): Promise<AuthProfile> {
  const profile = await requireSuperAdmin();
  await enforceSuperAdminMfaInAdminArea(profile, options);
  return profile;
}

/**
 * Enforcement API admin : 403 JSON si SA sans AAL2 (jamais de redirect HTML).
 */
export async function assertSuperAdminAal2Api(role: UserRole): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  const activeCount = await countActiveSuperAdmins();
  const { currentLevel } = await getSessionAalLevels();

  const decision = resolveSuperAdminMfaApiGate({
    role,
    activeSuperAdminCount: activeCount,
    currentLevel,
  });

  if (decision.action === "allow") {
    return { ok: true };
  }

  return {
    ok: false,
    response: NextResponse.json(
      {
        ok: false,
        error:
          "Vérification en deux étapes requise pour continuer en tant que super administrateur.",
        reasonCode: MFA_AAL2_REQUIRED,
      },
      { status: 403 },
    ),
  };
}
