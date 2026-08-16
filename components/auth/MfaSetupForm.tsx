"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  isValidTotpCode,
  logMfaSetupDiagnostic,
  mapMfaSetupError,
  mapTotpEnrollForDisplay,
  MFA_FACTOR_STALE_MESSAGE,
  resolveSetupChallengeFactorId,
  resolveTotpMountPrep,
  resolveTotpRestartCleanupIds,
  runMfaSetupActivation,
  throwMfaStepError,
} from "@/lib/auth/mfa-setup";
import { recordMfaSecurityAuditAction } from "@/lib/auth/mfa-security-actions";

type SetupPhase = "preparing" | "ready" | "submitting" | "restarting" | "done";

/**
 * Enroll TOTP côté navigateur uniquement.
 * QR / secret / URI restent en mémoire React — jamais loggés ni persistés.
 * factorId = id retourné par enroll (unverified) → challenge/verify directs.
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

  async function enrollFresh(
    supabase: ReturnType<typeof createClient>,
    friendlyName: string,
  ) {
    logMfaSetupDiagnostic("enroll", { code: "attempt", status: null });
    const enrolled = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName,
    });
    if (enrolled.error) throwMfaStepError("enroll", enrolled.error);
    if (!enrolled.data?.id) {
      throwMfaStepError("enroll", {
        message: "enroll_empty",
        code: "enroll_empty",
      });
    }
    logMfaSetupDiagnostic("enroll", { code: "ok", status: null });
    return mapTotpEnrollForDisplay(enrolled.data);
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const supabase = createClient();
        const listed = await supabase.auth.mfa.listFactors();
        if (listed.error) {
          // Ne bloque pas enroll : listFactors lit /user ; un échec ici
          // empêchait POST /factors (diagnostic prod).
          logMfaSetupDiagnostic("listFactors", listed.error);
        } else {
          const prep = resolveTotpMountPrep(listed.data?.totp ?? []);
          if (prep.action === "already_verified") {
            router.replace("/admin");
            return;
          }
        }

        const display = await enrollFresh(
          supabase,
          `KO Predict Authenticator ${Date.now()}`,
        );
        setFactorId(display.factorId);
        setQrDataUrl(display.qrDataUrl);
        setManualSecret(display.manualSecret);
        setPhase("ready");
      } catch (err) {
        setError(mapMfaSetupError(err));
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

    const resolved = resolveSetupChallengeFactorId(factorId);
    if (!resolved.ok) {
      setError(MFA_FACTOR_STALE_MESSAGE);
      return;
    }

    startTransition(async () => {
      setPhase("submitting");
      try {
        const supabase = createClient();
        await runMfaSetupActivation({
          factorId: resolved.factorId,
          code: trimmed,
          challenge: (args) => supabase.auth.mfa.challenge(args),
          verify: (args) => supabase.auth.mfa.verify(args),
          refreshSession: () => supabase.auth.refreshSession(),
          getCurrentAal: async () => {
            const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            return aal.data?.currentLevel;
          },
        });

        await recordMfaSecurityAuditAction({
          eventType: "MFA_ENROLLED",
          factorId: resolved.factorId,
        });

        setQrDataUrl(null);
        setManualSecret(null);
        setCode("");
        setPhase("done");
        router.replace("/admin");
        router.refresh();
      } catch (err) {
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as { code: unknown }).code === "aal_incomplete"
        ) {
          setError(
            "Vérification enregistrée, mais le niveau de sécurité n’est pas encore AAL2. Reconnectez-vous.",
          );
        } else {
          setError(mapMfaSetupError(err));
        }
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
        const supabase = createClient();
        const listed = await supabase.auth.mfa.listFactors();
        if (listed.error) throwMfaStepError("listFactors", listed.error);

        // `all` inclut unverified ; `totp` = verified only (inadapté au cleanup setup).
        const toRemove = resolveTotpRestartCleanupIds(listed.data?.all ?? []);
        for (const id of toRemove) {
          const removed = await supabase.auth.mfa.unenroll({ factorId: id });
          if (removed.error) throw removed.error;
        }

        setFactorId(null);
        setQrDataUrl(null);
        setManualSecret(null);

        const display = await enrollFresh(
          supabase,
          `KO Predict Authenticator ${Date.now()}`,
        );
        setFactorId(display.factorId);
        setQrDataUrl(display.qrDataUrl);
        setManualSecret(display.manualSecret);
        setPhase("ready");
      } catch (err) {
        setError(mapMfaSetupError(err));
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
