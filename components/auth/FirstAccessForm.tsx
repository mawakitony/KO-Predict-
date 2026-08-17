"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  AuthEmailIcon,
  AuthField,
  AuthKeyIcon,
  AuthLockIcon,
} from "@/components/ui/AuthField";

export function FirstAccessForm() {
  const { t } = useLanguage();
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
                setError(json?.error ?? t("auth.verifyFail"));
                return;
              }
              setStep("password");
            });
          }}
        >
          <AuthField
            icon={<AuthEmailIcon />}
            label={t("auth.emailAddress")}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder={t("auth.emailAddress")}
          />
          <AuthField
            icon={<AuthKeyIcon />}
            label={t("auth.activationCode")}
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
            {pending ? t("common.verifying") : t("auth.continue")}
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
                setError(json?.error ?? t("auth.activateFail"));
                return;
              }
              if (json?.error && json.redirectTo) {
                setError(json.error);
                window.location.href = json.redirectTo;
                return;
              }
              if (!json?.ok) {
                setError(json?.error ?? t("auth.activateFail"));
                return;
              }
              window.location.href = json.redirectTo ?? "/dashboard";
            });
          }}
        >
          <p className="text-center text-sm text-white/70">
            {t("auth.createPassword")}
          </p>
          <AuthField
            icon={<AuthLockIcon />}
            label={t("auth.newPassword")}
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={t("auth.newPassword")}
          />
          <AuthField
            icon={<AuthLockIcon />}
            label={t("auth.confirmPassword")}
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            placeholder={t("auth.confirmPassword")}
          />
          {errorBox}
          <button type="submit" disabled={pending} className="ko-auth-btn">
            {pending ? t("auth.activating") : t("auth.activate")}
          </button>
        </form>
      )}
    </div>
  );
}
