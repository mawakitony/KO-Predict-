import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountSecurityPanel } from "@/components/account/AccountSecurityPanel";
import { AdminHubLayout } from "@/components/admin/AdminHubLayout";
import { mapVerifiedTotpFactorOptions } from "@/lib/auth/mfa-challenge";
import { resolveAccountSecurityAccess } from "@/lib/auth/mfa-security";
import { staffPermissions } from "@/lib/auth/permissions";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Sécurité du compte | KO Predict™",
  robots: { index: false, follow: false },
};

export default async function AccountSecurityPage() {
  const profile = await getCurrentProfile();
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

  const access = resolveAccountSecurityAccess({
    authenticated: Boolean(profile),
    role: profile?.role,
    accountStatus: profile?.accountStatus,
    currentLevel,
    verifiedTotpFactorCount: verifiedFactors.length,
  });

  if (access.action === "redirect") {
    redirect(access.to);
  }

  if (!profile) {
    redirect("/login");
  }

  const permissions = staffPermissions(profile.role);

  return (
    <AdminHubLayout
      email={profile.email}
      firstName={profile.firstName}
      lastName={profile.lastName}
      displayName={profile.displayName}
      avatarUrl={profile.avatarUrl}
      canManageTeam={permissions.canManageTeam}
      showSecurityLink
    >
      <section className="ko-admin-panel">
        <div className="ko-admin-panel-head">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              Compte
            </p>
            <h1 className="ko-display mt-1 text-xl font-semibold text-slate-900">
              Sécurité du compte
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Vérification en deux étapes et sessions actives
            </p>
          </div>
        </div>
        <div className="ko-admin-panel-body">
          <AccountSecurityPanel verifiedFactors={verifiedFactors} />
        </div>
      </section>
    </AdminHubLayout>
  );
}
