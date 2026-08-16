"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { InviteHashSessionBootstrap } from "@/components/auth/InviteHashSessionBootstrap";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { AuthShell } from "@/components/ui/AuthShell";
import { HeroBackdrop } from "@/components/ui/HeroBackdrop";

export function ResetPasswordPageClient() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const onReady = useCallback((sessionOk: boolean) => {
    setHasSession(sessionOk);
    setReady(true);
  }, []);

  return (
    <HeroBackdrop variant="auth">
      <AuthShell
        title="Nouveau mot de passe"
        subtitle="Choisissez un mot de passe pour votre compte KO Predict™."
        footer={
          <p className="text-center text-sm">
            <Link href="/login" className="ko-auth-link font-semibold">
              Retour à la connexion
            </Link>
          </p>
        }
      >
        <InviteHashSessionBootstrap
          pendingMessage="Vérification du lien de réinitialisation…"
          onReady={onReady}
        />
        {ready && hasSession ? <ResetPasswordForm /> : null}
        {ready && !hasSession ? (
          <p className="text-sm font-medium text-rose-200" role="alert">
            Lien invalide ou expiré. Demandez à votre administrateur d’envoyer un
            nouveau lien de réinitialisation.
          </p>
        ) : null}
      </AuthShell>
    </HeroBackdrop>
  );
}
