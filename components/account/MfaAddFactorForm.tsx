"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  activateAdditionalMfaFactor,
  restartAdditionalMfaFactor,
  startAdditionalMfaFactor,
} from "@/lib/auth/mfa-additional-actions";
import { isValidTotpCode } from "@/lib/auth/mfa-setup";

type Phase = "preparing" | "ready" | "submitting" | "restarting" | "done";

/**
 * Ajout d’un facteur TOTP supplémentaire via Server Actions SSR.
 * QR / secret uniquement en mémoire React — jamais loggés ni persistés.
 */
export function MfaAddFactorForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("preparing");
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
        const result = await startAdditionalMfaFactor();
        if (!result.ok) {
          setError(result.error);
          setPhase("ready");
          return;
        }
        applyEnrollment(result);
        setPhase("ready");
      } catch {
        setError("Impossible d’ajouter un facteur. Réessayez.");
        setPhase("ready");
      }
    })();
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.trim();
    if (!isValidTotpCode(trimmed)) {
      setError("Entrez le code à 6 chiffres affiché dans votre application.");
      return;
    }
    if (!factorId) {
      setError("Configuration incomplète. Réessayez.");
      return;
    }

    startTransition(async () => {
      setPhase("submitting");
      try {
        const result = await activateAdditionalMfaFactor({
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
        router.refresh();
        onCancel();
      } catch {
        setError("Impossible d’ajouter un facteur. Réessayez.");
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
        const result = await restartAdditionalMfaFactor({
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
        setError("Impossible d’ajouter un facteur. Réessayez.");
        setPhase("ready");
      }
    });
  }

  if (phase === "preparing" || phase === "restarting") {
    return (
      <p className="text-sm text-slate-500">
        {phase === "restarting"
          ? "Nouvelle configuration…"
          : "Préparation du nouveau facteur…"}
      </p>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
    >
      <p className="text-sm font-semibold text-slate-800">Nouveau facteur TOTP</p>
      <ol className="space-y-1 text-sm text-slate-600">
        <li>1. Ouvrez votre application d’authentification</li>
        <li>2. Scannez le QR code</li>
        <li>3. Entrez le code à 6 chiffres</li>
      </ol>

      {qrDataUrl ? (
        <div className="mx-auto flex max-w-[200px] flex-col items-center rounded-xl bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR code d’enrôlement MFA"
            className="h-auto w-full"
          />
        </div>
      ) : null}

      {manualSecret ? (
        <div className="text-center">
          <button
            type="button"
            className="text-xs font-semibold text-slate-600 underline"
            onClick={() => setShowManual((v) => !v)}
          >
            {showManual ? "Masquer la clé manuelle" : "Saisie manuelle de la clé"}
          </button>
          {showManual ? (
            <p className="mt-2 break-all font-mono text-xs text-slate-700">
              {manualSecret}
            </p>
          ) : null}
        </div>
      ) : null}

      <label className="block text-sm font-medium text-slate-700">
        Code à 6 chiffres
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 tracking-[0.3em] outline-none focus:border-blue-400"
          required
        />
      </label>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending || phase === "submitting" || !factorId}
          className="rounded-xl bg-[var(--admin-blue)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending || phase === "submitting"
            ? "Activation…"
            : "Activer ce facteur"}
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
          onClick={onCancel}
        >
          Annuler
        </button>
        {error || factorId ? (
          <button
            type="button"
            disabled={pending}
            onClick={onRestart}
            className="text-sm font-semibold text-slate-600 underline disabled:opacity-50"
          >
            Recommencer
          </button>
        ) : null}
      </div>
    </form>
  );
}
