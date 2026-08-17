"use client";

import { useActionState } from "react";
import { signInAction, type AuthActionState } from "@/lib/auth/actions";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  AuthEmailIcon,
  AuthField,
  AuthLockIcon,
} from "@/components/ui/AuthField";

const initialState: AuthActionState = { error: null };

interface LoginFormProps {
  next?: string;
}

export function LoginForm({ next }: LoginFormProps) {
  const { t } = useLanguage();
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="next" value={next ?? ""} />

      <AuthField
        icon={<AuthEmailIcon />}
        label={t("common.email")}
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder={t("common.email")}
      />

      <AuthField
        icon={<AuthLockIcon />}
        label={t("auth.password")}
        type="password"
        name="password"
        required
        autoComplete="current-password"
        placeholder={t("auth.password")}
      />

      {state.error ? (
        <p className="ko-auth-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="ko-auth-btn">
        {pending ? t("auth.loginPending") : t("auth.loginSubmit")}
      </button>
    </form>
  );
}
