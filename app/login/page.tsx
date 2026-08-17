import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthShell } from "@/components/ui/AuthShell";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";
import { getCurrentProfile } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/roles";

interface PageProps {
  searchParams: Promise<{ next?: string; reset?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const profile = await getCurrentProfile();
  const params = await searchParams;

  if (profile) {
    redirect(homePathForRole(profile.role));
  }

  return (
    <HeroBackdrop variant="auth">
      <AuthShell
        title="Connexion"
        subtitle="Accédez à votre tableau de bord de préparation."
        footer={
          <>
            {params.reset === "1" ? (
              <p className="text-center text-sm font-semibold text-emerald-200">
                Mot de passe mis à jour. Connectez-vous avec le nouveau mot de
                passe.
              </p>
            ) : null}
            <p className="text-center text-sm ko-auth-muted">
              Première connexion ?{" "}
              <Link href="/first-access" className="ko-auth-link font-semibold">
                Terminer ma première connexion
              </Link>
            </p>
            <p className="text-center text-xs ko-auth-muted italic">
              Mot de passe oublié : contactez WOLOYEM.{" "}
              <Link href="/auth/reset-access" className="ko-auth-link not-italic">
                J’ai un code
              </Link>
            </p>
            <p className="text-center text-xs">
              <Link href="/" className="ko-auth-link">
                Retour à l&apos;accueil
              </Link>
            </p>
          </>
        }
      >
        <LoginForm next={params.next} />
      </AuthShell>
    </HeroBackdrop>
  );
}
