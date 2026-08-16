"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  setNewPasswordAfterRecoveryAction,
  type ResetPasswordActionState,
} from "@/lib/auth/reset-password-actions";
import { AuthField, AuthLockIcon } from "@/components/ui/AuthField";

const initialState: ResetPasswordActionState = { error: null };

export function ResetPasswordForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    setNewPasswordAfterRecoveryAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.replace("/login?reset=1");
    }
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-6">
      <AuthField
        icon={<AuthLockIcon />}
        label="Nouveau mot de passe"
        type="password"
        name="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Nouveau mot de passe"
      />
      <AuthField
        icon={<AuthLockIcon />}
        label="Confirmer"
        type="password"
        name="confirm"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="Confirmer le mot de passe"
      />

      {state.error ? (
        <p className="text-sm font-medium text-rose-300" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="ko-auth-btn w-full"
      >
        {pending ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </button>
    </form>
  );
}
