"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { verifyMfaChallenge } from "@/lib/auth/mfa-challenge-actions";
import {
  isAllowedChallengeFactorId,
  isValidTotpCode,
  MFA_CHALLENGE_ERROR_COOLDOWN_MS,
  pickDefaultChallengeFactorId,
  type MfaChallengeFactorOption,
} from "@/lib/auth/mfa-challenge";

interface MfaChallengeFormProps {
  factors: MfaChallengeFactorOption[];
  next: string;
}

/**
 * Challenge TOTP via Server Action SSR — aucun auth.mfa browser.
 * Sélection multi-facteur conservée. Aucun enroll / unenroll. Aucun OTP loggé.
 */
export function MfaChallengeForm({ factors, next }: MfaChallengeFormProps) {
  const router = useRouter();
  const [factorId, setFactorId] = useState(
    () => pickDefaultChallengeFactorId(factors) ?? "",
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => setNow(Date.now()), 200);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const coolingDown = cooldownUntil > now;
  const showFactorPicker = factors.length > 1;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (coolingDown || pending) return;

    setError(null);
    const trimmed = code.trim();
    if (!isValidTotpCode(trimmed)) {
      setError("Entrez le code à 6 chiffres affiché dans votre application.");
      setCooldownUntil(Date.now() + MFA_CHALLENGE_ERROR_COOLDOWN_MS);
      return;
    }
    if (!isAllowedChallengeFactorId(factorId, factors)) {
      setError("Choisissez une application d’authentification.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await verifyMfaChallenge({
          factorId,
          code: trimmed,
          next,
        });
        if (!result.ok) {
          setError(result.error);
          setCooldownUntil(Date.now() + MFA_CHALLENGE_ERROR_COOLDOWN_MS);
          return;
        }

        setCode("");
        router.replace(result.next);
        router.refresh();
      } catch {
        setError("Vérification impossible. Réessayez.");
        setCooldownUntil(Date.now() + MFA_CHALLENGE_ERROR_COOLDOWN_MS);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {showFactorPicker ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-white/80">
            Application d’authentification
          </legend>
          <div className="space-y-2">
            {factors.map((factor) => (
              <label
                key={factor.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white/90"
              >
                <input
                  type="radio"
                  name="factorId"
                  value={factor.id}
                  checked={factorId === factor.id}
                  onChange={() => setFactorId(factor.id)}
                  className="accent-white"
                />
                <span>{factor.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <label className="block text-sm font-medium text-white/80">
        Code à 6 chiffres
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="mt-1.5 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-base tracking-[0.3em] text-white outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20"
          placeholder="••••••"
          required
        />
      </label>

      {error ? (
        <p className="ko-auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || coolingDown || !factorId}
        className="ko-auth-btn min-h-12"
      >
        {pending
          ? "Vérification…"
          : coolingDown
            ? "Patientez…"
            : "Vérifier"}
      </button>
    </form>
  );
}
