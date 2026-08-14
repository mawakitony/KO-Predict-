import Link from "next/link";
import { redirect } from "next/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { homePathForRole } from "@/lib/auth/roles";
import { getCurrentProfile } from "@/lib/auth/session";
import { DISABLED_ACCESS_MESSAGE } from "@/lib/admin/account-access-constants";
import { AuthShell } from "@/components/ui/AuthShell";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

export const dynamic = "force-dynamic";

/**
 * Hors layout /dashboard pour éviter une boucle de redirect.
 */
export default async function AccessDisabledPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }
  if (profile.accountStatus !== "DISABLED") {
    redirect(homePathForRole(profile.role));
  }

  return (
    <HeroBackdrop variant="auth">
      <AuthShell
        title="Accès désactivé"
        subtitle={DISABLED_ACCESS_MESSAGE}
        footer={
          <p className="text-center text-xs">
            <Link href="/" className="ko-auth-link">
              Accueil
            </Link>
          </p>
        }
      >
        <form action={signOutAction}>
          <button type="submit" className="ko-auth-btn">
            Se déconnecter
          </button>
        </form>
      </AuthShell>
    </HeroBackdrop>
  );
}
