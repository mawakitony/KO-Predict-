"use client";

import { useCallback, useState, useTransition } from "react";
import Link from "next/link";
import { InviteHashSessionBootstrap } from "@/components/auth/InviteHashSessionBootstrap";
import { FinalizeForm } from "@/components/auth/FinalizeForm";

interface FinalizeClientProps {
  initialEmail: string | null;
  initialHasSession: boolean;
  errorMessage: string | null;
}

export function FinalizeClient({
  initialEmail,
  initialHasSession,
  errorMessage,
}: FinalizeClientProps) {
  const [hasSession, setHasSession] = useState(initialHasSession);
  const [email, setEmail] = useState(initialEmail);
  const [bootstrapped, setBootstrapped] = useState(initialHasSession);
  const [, startTransition] = useTransition();

  const onReady = useCallback((ok: boolean) => {
    setBootstrapped(true);
    setHasSession(ok);
    if (ok) {
      startTransition(async () => {
        const res = await fetch("/api/auth/session-email", { cache: "no-store" });
        const json = (await res.json().catch(() => null)) as {
          email?: string | null;
        } | null;
        if (json?.email) setEmail(json.email);
      });
    }
  }, []);

  return (
    <div className="rounded-2xl border border-white/10 bg-white p-8 shadow-xl shadow-black/10">
      <p className="font-[family-name:var(--font-outfit)] text-2xl font-semibold text-slate-900">
        KO Predict™
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-outfit)] text-xl font-medium text-slate-800">
        Bienvenue
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Créez votre mot de passe pour finaliser votre accès à KO Predict™.
      </p>

      {errorMessage ? (
        <p
          className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {!bootstrapped ? (
        <InviteHashSessionBootstrap onReady={onReady} />
      ) : null}

      {bootstrapped && !hasSession ? (
        <div className="mt-6 space-y-3 text-sm text-slate-600">
          <p>
            Aucune session d&apos;invitation active. Rouvrez le lien reçu par
            email (« Accept invitation »), ou demandez à l&apos;admin de
            renvoyer l&apos;invitation.
          </p>
          <Link
            href="/login"
            className="inline-flex text-[var(--accent-hover)] hover:underline"
          >
            Aller à la connexion (compte déjà activé)
          </Link>
        </div>
      ) : null}

      {bootstrapped && hasSession ? (
        <>
          {email ? (
            <p className="mt-4 text-sm text-slate-500">
              Compte :{" "}
              <span className="font-medium text-slate-800">{email}</span>
            </p>
          ) : null}
          <FinalizeForm />
        </>
      ) : null}
    </div>
  );
}
