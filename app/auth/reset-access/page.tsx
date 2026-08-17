import Link from "next/link";
import { ResetAccessForm } from "@/components/auth/ResetAccessForm";
import { AuthShell } from "@/components/ui/AuthShell";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

export const dynamic = "force-dynamic";

export default function ResetAccessPage() {
  return (
    <HeroBackdrop variant="auth">
      <AuthShell
        title="Réinitialiser l’accès"
        subtitle="Saisissez l’email de votre compte et le code temporaire communiqué par WOLOYEM."
        footer={
          <p className="text-center text-sm">
            <Link href="/login" className="ko-auth-link font-semibold">
              Retour à la connexion
            </Link>
          </p>
        }
      >
        <ResetAccessForm />
      </AuthShell>
    </HeroBackdrop>
  );
}
