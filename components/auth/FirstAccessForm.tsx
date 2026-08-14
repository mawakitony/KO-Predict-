"use client";

import { useState, useTransition } from "react";
import {
  AuthEmailIcon,
  AuthField,
  AuthKeyIcon,
  AuthLockIcon,
} from "@/components/ui/AuthField";

export function FirstAccessForm() {
  const [step, setStep] = useState<"verify" | "password">("verify");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const errorBox = error ? (
    <p className="ko-auth-error" role="alert">
      {error}
    </p>
  ) : null;

  return (
    <div className="space-y-6">
      {step === "verify" ? (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const res = await fetch("/api/auth/first-access/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email,
                  activationCode: code,
                }),
              });
              const json = (await res.json().catch(() => null)) as {
                ok?: boolean;
                error?: string;
              } | null;
              if (!res.ok || !json?.ok) {
                setError(json?.error ?? "Email ou code d’activation incorrect.");
                return;
              }
              setStep("password");
            });
          }}
        >
          <AuthField
            icon={<AuthEmailIcon />}
            label="Adresse email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="Adresse email"
          />
          <AuthField
            icon={<AuthKeyIcon />}
            label="Code d’activation"
            type="text"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="KP-XXXX-XXXX"
            className="font-mono uppercase tracking-wide"
            autoComplete="one-time-code"
          />
          {errorBox}
          <button type="submit" disabled={pending} className="ko-auth-btn">
            {pending ? "Vérification…" : "Continuer"}
          </button>
        </form>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const res = await fetch("/api/auth/first-access/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password, confirm }),
              });
              const json = (await res.json().catch(() => null)) as {
                ok?: boolean;
                error?: string;
                redirectTo?: string;
              } | null;
              if (!json?.ok && res.status !== 200) {
                setError(json?.error ?? "Impossible d’activer le compte.");
                return;
              }
              if (json?.error && json.redirectTo) {
                setError(json.error);
                window.location.href = json.redirectTo;
                return;
              }
              if (!json?.ok) {
                setError(json?.error ?? "Impossible d’activer le compte.");
                return;
              }
              window.location.href = json.redirectTo ?? "/dashboard";
            });
          }}
        >
          <p className="text-center text-sm text-white/70">
            Créez votre mot de passe
          </p>
          <AuthField
            icon={<AuthLockIcon />}
            label="Nouveau mot de passe"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder="Nouveau mot de passe"
          />
          <AuthField
            icon={<AuthLockIcon />}
            label="Confirmer le mot de passe"
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder="Confirmer le mot de passe"
          />
          {errorBox}
          <button type="submit" disabled={pending} className="ko-auth-btn">
            {pending ? "Activation…" : "Activer mon compte"}
          </button>
        </form>
      )}
    </div>
  );
}
