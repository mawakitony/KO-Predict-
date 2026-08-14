"use client";

import { useActionState } from "react";
import { signInAction, type AuthActionState } from "@/lib/auth/actions";
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
  const [state, formAction, pending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="next" value={next ?? ""} />

      <AuthField
        icon={<AuthEmailIcon />}
        label="Email"
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="Email"
      />

      <AuthField
        icon={<AuthLockIcon />}
        label="Mot de passe"
        type="password"
        name="password"
        required
        autoComplete="current-password"
        placeholder="Mot de passe"
      />

      {state.error ? (
        <p className="ko-auth-error" role="alert">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="ko-auth-btn">
        {pending ? "Connexion…" : "Connexion"}
      </button>
    </form>
  );
}
