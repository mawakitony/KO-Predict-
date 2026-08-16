import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaChallengeForm } from "@/components/auth/MfaChallengeForm";
import { AuthShell } from "@/components/ui/AuthShell";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";
import { countActiveSuperAdmins } from "@/lib/admin/super-admin-guards";
import {
  mapVerifiedTotpFactorOptions,
  resolveMfaChallengeAccess,
} from "@/lib/auth/mfa-challenge";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Vérification en deux étapes | KO Predict™",
  robots: { index: false, follow: false },
};

interface MfaChallengePageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function MfaChallengePage({
  searchParams,
}: MfaChallengePageProps) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const activeCount = profile ? await countActiveSuperAdmins() : 0;

  let currentLevel: string | null = null;
  let verifiedFactors: ReturnType<typeof mapVerifiedTotpFactorOptions> = [];

  if (profile?.role === "super_admin") {
    const supabase = await createClient();
    const [aal, factors] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors(),
    ]);
    currentLevel = aal.data?.currentLevel ?? null;
    verifiedFactors = mapVerifiedTotpFactorOptions(factors.data?.totp);
  }

  const access = resolveMfaChallengeAccess({
    authenticated: Boolean(profile),
    role: profile?.role,
    accountStatus: profile?.accountStatus,
    activeSuperAdminCount: activeCount,
    currentLevel,
    verifiedFactors,
    requestedNext: params.next,
  });

  if (access.action === "redirect") {
    redirect(access.to);
  }

  return (
    <HeroBackdrop variant="auth">
      <div className="contents" data-no-store="mfa-challenge">
        <AuthShell
          title="Vérification en deux étapes"
          subtitle="Entrez le code de votre application d’authentification pour continuer."
        >
          <MfaChallengeForm factors={access.factors} next={access.next} />
        </AuthShell>
      </div>
    </HeroBackdrop>
  );
}
