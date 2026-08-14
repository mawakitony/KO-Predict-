"use client";

import { useState, useTransition, type InputHTMLAttributes } from "react";
import {
  markInvitationAcceptedAction,
  setPasswordAction,
} from "@/lib/auth/finalize-actions";

function EyeIcon({ off = false }: { off?: boolean }) {
  if (off) {
    return (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M10.7 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.4 18.4 0 0 1-2.2 3.1" />
        <path d="M6.7 6.7C4.1 8.5 2 12 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4.3-1" />
        <path d="M14.1 14.1A3 3 0 0 1 9.9 9.9" />
        <path d="m3 3 18 18" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PasswordInput({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-sm text-slate-600">
      {label}
      <span className="relative mt-1 block">
        <input
          {...props}
          type={visible ? "text" : "password"}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-11 text-slate-900"
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 transition hover:text-slate-800"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
        >
          <EyeIcon off={visible} />
        </button>
      </span>
    </label>
  );
}

export function FinalizeForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        const form = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await setPasswordAction(form);
          if (result.error) {
            setError(result.error);
            return;
          }
          await markInvitationAcceptedAction();
          window.location.href = "/dashboard";
        });
      }}
    >
      <PasswordInput
        label="Nouveau mot de passe"
        name="password"
        required
        minLength={8}
        placeholder="Au moins 8 caractères"
        autoComplete="new-password"
      />
      <PasswordInput
        label="Confirmer le mot de passe"
        name="confirm"
        required
        minLength={8}
        autoComplete="new-password"
      />
      {error ? (
        <p
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
      >
        {pending ? "Activation…" : "Activer mon compte"}
      </button>
    </form>
  );
}
