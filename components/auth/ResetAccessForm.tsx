"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  AuthEmailIcon,
  AuthField,
  AuthKeyIcon,
  AuthLockIcon,
} from "@/components/ui/AuthField";
import {
  PASSWORD_RESET_AUTH_FAILED,
  PASSWORD_RESET_CODE_GENERIC_ERROR,
  PASSWORD_RESET_SUCCESS_MESSAGE,
} from "@/lib/auth/password-reset-constants";

export function ResetAccessForm() {
  const { t } = useLanguage();
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
            label={t("auth.tempCode")}
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
            {pending ? t("common.verifying") : t("common.verify")}
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
                setError(json?.error ?? PASSWORD_RESET_AUTH_FAILED);
                return;
              }
              setSuccess(PASSWORD_RESET_SUCCESS_MESSAGE);
              window.location.href = json.redirectTo ?? "/login?reset=1";
            });
          }}
        >
          <p className="text-center text-sm text-white/70">
            {t("auth.choosePassword")}
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
          {successBox}
          <button type="submit" disabled={pending} className="ko-auth-btn">
            {pending ? t("auth.savingPassword") : t("auth.savePassword")}
          </button>
        </form>
      )}
    </div>
  );
}
