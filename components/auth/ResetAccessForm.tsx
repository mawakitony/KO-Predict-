"use client";

import { useState, useTransition } from "react";
import {
  AuthEmailIcon,
  AuthField,
  AuthKeyIcon,
  AuthLockIcon,
} from "@/components/ui/AuthField";
import {
  PASSWORD_RESET_CODE_GENERIC_ERROR,
  PASSWORD_RESET_SUCCESS_MESSAGE,
} from "@/lib/auth/password-reset-constants";

export function ResetAccessForm() {
  const [step, setStep] = useState<"verify" | "password">("verify");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const errorBox = error ? (
    <p className="ko-auth-error" role="alert">
      {error}
    </p>
  ) : null;

  const successBox = success ? (
    <p className="text-center text-sm font-semibold text-emerald-200" role="status">
      {success}
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
            setSuccess(null);
            startTransition(async () => {
              const res = await fetch("/api/auth/reset-access/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
              });
              const json = (await res.json().catch(() => null)) as {
                ok?: boolean;
                error?: string;
              } | null;
              if (!res.ok || !json?.ok) {
                setError(json?.error ?? PASSWORD_RESET_CODE_GENERIC_ERROR);
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
            label="Code temporaire"
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
            {pending ? "Vérification…" : "Vérifier"}
          </button>
        </form>
      ) : (
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setSuccess(null);
            startTransition(async () => {
              const res = await fetch("/api/auth/reset-access/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  password,
                  confirmPassword: confirm,
                }),
              });
              const json = (await res.json().catch(() => null)) as {
                ok?: boolean;
                error?: string;
                redirectTo?: string;
              } | null;
              if (!res.ok || !json?.ok) {
                setError(
                  json?.error ??
                    "Impossible de mettre à jour le mot de passe. Réessayez.",
                );
                return;
              }
              setSuccess(PASSWORD_RESET_SUCCESS_MESSAGE);
              window.location.href = json.redirectTo ?? "/login?reset=1";
            });
          }}
        >
          <p className="text-center text-sm text-white/70">
            Choisissez un nouveau mot de passe
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
          {successBox}
          <button type="submit" disabled={pending} className="ko-auth-btn">
            {pending ? "Enregistrement…" : "Enregistrer le mot de passe"}
          </button>
        </form>
      )}
    </div>
  );
}
