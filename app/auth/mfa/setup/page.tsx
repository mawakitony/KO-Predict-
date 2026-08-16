import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MfaSetupForm } from "@/components/auth/MfaSetupForm";
import { AuthShell } from "@/components/ui/AuthShell";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";
import { countActiveSuperAdmins } from "@/lib/admin/super-admin-guards";
import { resolveMfaSetupAccess } from "@/lib/auth/mfa-setup";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Sécurisez votre compte | KO Predict™",
  robots: { index: false, follow: false },
};

export default async function MfaSetupPage() {
  const profile = await getCurrentProfile();
  const activeCount = profile ? await countActiveSuperAdmins() : 0;

  let verifiedTotpFactorCount = 0;
  if (profile?.role === "super_admin") {
    const supabase = await createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    verifiedTotpFactorCount = (data?.totp ?? []).filter(
      (f) => f.status === "verified",
    ).length;
  }

  const access = resolveMfaSetupAccess({
    authenticated: Boolean(profile),
    role: profile?.role,
    accountStatus: profile?.accountStatus,
    activeSuperAdminCount: activeCount,
    verifiedTotpFactorCount,
  });

  if (access.action === "redirect") {
    redirect(access.to);
  }

  return (
    <HeroBackdrop variant="auth">
      <div className="contents" data-no-store="mfa-setup">
        <AuthShell
          title="Sécurisez votre compte"
          subtitle="La vérification en deux étapes protège l’accès super administrateur KO Predict™."
        >
          <MfaSetupForm />
        </AuthShell>
      </div>
    </HeroBackdrop>
  );
}
