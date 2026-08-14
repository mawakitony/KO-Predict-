import Link from "next/link";
import { FirstAccessForm } from "@/components/auth/FirstAccessForm";
import { AuthShell } from "@/components/ui/AuthShell";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

export const dynamic = "force-dynamic";

export default function FirstAccessPage() {
  return (
    <HeroBackdrop variant="auth">
      <AuthShell
        title="Première connexion"
        subtitle="Votre accès KO Predict™ a été activé par WOLOYEM."
        footer={
          <p className="text-center text-sm">
            <Link href="/login" className="ko-auth-link font-semibold">
              J’ai déjà un mot de passe
            </Link>
          </p>
        }
      >
        <FirstAccessForm />
      </AuthShell>
    </HeroBackdrop>
  );
}
