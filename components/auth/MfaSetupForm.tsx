"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  activateMfaEnrollment,
  restartMfaEnrollment,
  startMfaEnrollment,
} from "@/lib/auth/mfa-setup-actions";
import {
  isValidTotpCode,
  MFA_FACTOR_STALE_MESSAGE,
} from "@/lib/auth/mfa-setup";

type SetupPhase = "preparing" | "ready" | "submitting" | "restarting" | "done";

/**
 * Setup MFA : enroll / challenge / verify via Server Actions (session SSR).
 * QR + secret uniquement en mémoire React — jamais loggés ni persistés.
 */
export function MfaSetupForm() {
  const router = useRouter();
  const [phase, setPhase] = useState<SetupPhase>("preparing");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const started = useRef(false);

  function applyEnrollment(payload: {
    factorId: string;
    qrDataUrl: string;
    manualSecret: string;
  }) {
    setFactorId(payload.factorId);
    setQrDataUrl(payload.qrDataUrl);
    setManualSecret(payload.manualSecret);
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const result = await startMfaEnrollment();
        if (!result.ok) {
          if (result.code === "already_verified") {
            router.replace("/admin");
            return;
          }
          if (result.code === "enforcement_disabled") {
            router.replace("/admin");
            return;
          }
          setError(result.error);
          setPhase("ready");
          return;
        }
        applyEnrollment(result);
        setPhase("ready");
      } catch {
        setError("Impossible d’activer la vérification. Réessayez.");
        setPhase("ready");
      }
    })();
  }, [router]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (!isValidTotpCode(trimmed)) {
      setError("Entrez le code à 6 chiffres affiché dans votre application.");
      return;
    }
    if (!factorId) {
      setError(MFA_FACTOR_STALE_MESSAGE);
      return;
    }

    startTransition(async () => {
      setPhase("submitting");
      try {
        const result = await activateMfaEnrollment({
          factorId,
          code: trimmed,
        });
        if (!result.ok) {
          setError(result.error);
          setPhase("ready");
          return;
        }

        setQrDataUrl(null);
        setManualSecret(null);
        setCode("");
        setPhase("done");
        router.replace("/admin");
        router.refresh();
      } catch {
        setError("Impossible d’activer la vérification. Réessayez.");
        setPhase("ready");
      }
    });
  }

  function onRestart() {
    startTransition(async () => {
      setError(null);
      setPhase("restarting");
      setCode("");
      try {
        const result = await restartMfaEnrollment({
          currentFactorId: factorId,
        });
        if (!result.ok) {
          setError(result.error);
          setPhase("ready");
          return;
        }
        applyEnrollment(result);
        setPhase("ready");
      } catch {
        setError("Impossible d’activer la vérification. Réessayez.");
        setPhase("ready");
      }
    });
  }

  if (phase === "preparing" || phase === "restarting") {
    return (
      <p className="text-center text-sm text-white/70">
        {phase === "restarting"
          ? "Nouvelle configuration…"
          : "Préparation de la vérification…"}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <ol className="space-y-2 text-sm text-white/75">
        <li>1. Ouvrez votre application d’authentification</li>
        <li>2. Scannez le QR code</li>
        <li>3. Entrez le code à 6 chiffres</li>
      </ol>

      {qrDataUrl ? (
        <div className="mx-auto flex max-w-[220px] flex-col items-center gap-3 rounded-2xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR code d’enrôlement MFA"
            className="h-auto w-full"
            width={200}
            height={200}
          />
        </div>
      ) : null}

      {manualSecret ? (
        <div className="text-center">
          <button
            type="button"
            className="text-xs font-semibold text-white/80 underline underline-offset-2"
            onClick={() => setShowManual((v) => !v)}
          >
            {showManual ? "Masquer la clé manuelle" : "Saisie manuelle de la clé"}
          </button>
          {showManual ? (
            <p className="mt-2 break-all rounded-xl bg-black/25 px-3 py-2 font-mono text-xs tracking-wide text-white/90">
              {manualSecret}
            </p>
          ) : null}
        </div>
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
        disabled={pending || phase === "submitting" || !factorId}
        className="ko-auth-btn min-h-12"
      >
        {pending || phase === "submitting"
          ? "Activation…"
          : "Activer la vérification"}
      </button>

      {error || factorId ? (
        <button
          type="button"
          disabled={pending}
          onClick={onRestart}
          className="w-full text-center text-sm font-semibold text-white/75 underline underline-offset-2 disabled:opacity-50"
        >
          Recommencer la configuration
        </button>
      ) : null}
    </form>
  );
}
