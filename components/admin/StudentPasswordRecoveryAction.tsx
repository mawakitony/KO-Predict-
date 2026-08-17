"use client";

import { useState } from "react";
import {
  ActivationCodeModal,
  type ActivationCodeModalData,
} from "@/components/admin/ActivationCodeModal";
import { IconMail, IconRefresh } from "@/components/admin/AdminIcons";

/**
 * Actions d’accès pour un apprenant ACTIVE :
 * - Réinitialiser l’accès (code temporaire 60 min)
 * - Envoyer un lien email (flux existant conservé)
 * PENDING_ACTIVATION : pas de bouton ici (Régénérer côté roster).
 * DISABLED : message réactiver d’abord.
 */
export function StudentPasswordRecoveryAction({
  studentId,
  email,
  fullName,
  accountStatus,
  canManage,
}: {
  studentId: string;
  email?: string | null;
  fullName?: string | null;
  accountStatus?: string | null;
  canManage: boolean;
}) {
  const [busy, setBusy] = useState<"reset" | "email" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ActivationCodeModalData | null>(null);

  if (!canManage || !studentId) return null;

  if (accountStatus === "DISABLED") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">Accès au compte</p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Réactivez d’abord le compte.
        </p>
      </div>
    );
  }

  if (accountStatus !== "ACTIVE") {
    return null;
  }

  async function issueResetCode() {
    const ok = window.confirm(
      "Générer un code de réinitialisation valable 60 minutes ? Communiquez-le à l’apprenant hors plateforme. Un éventuel code PENDING précédent sera révoqué.",
    );
    if (!ok) return;

    setBusy("reset");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(
        "/api/admin/students/issue-password-reset-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        resetCode?: string;
        resetExpiresAt?: string;
        fullName?: string;
        email?: string;
      } | null;
      if (!res.ok || !json?.ok || !json.resetCode || !json.resetExpiresAt) {
        setError(json?.error ?? "Émission impossible.");
        return;
      }
      setModal({
        fullName: json.fullName ?? fullName ?? "—",
        email: json.email ?? email ?? "—",
        activationCode: json.resetCode,
        expiresAt: json.resetExpiresAt,
      });
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(null);
    }
  }

  async function sendRecovery() {
    const displayEmail = email?.trim() || "l’apprenant";
    const ok = window.confirm(
      `Cette action permettra à l’apprenant de définir un nouveau mot de passe. Un email de récupération sera envoyé à ${displayEmail}.`,
    );
    if (!ok) return;

    setBusy("email");
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/students/send-password-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        setError(json?.error ?? "Envoi impossible.");
        return;
      }
      setMessage("Lien de réinitialisation envoyé.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {modal ? (
        <ActivationCodeModal
          data={modal}
          onClose={() => setModal(null)}
          title="Code de réinitialisation"
          hint="Communiquez ce code à l’apprenant hors plateforme. Il expire dans 60 minutes et ne pourra plus être relu."
        />
      ) : null}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">Accès au compte</p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          Mot de passe oublié : générez un code temporaire (60 min) ou envoyez
          un lien email.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void issueResetCode()}
            className="ko-btn-blue !px-2.5 !py-1.5 text-xs"
          >
            <IconRefresh className="ko-icon-sm" />
            {busy === "reset" ? "Génération…" : "Réinitialiser l’accès"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void sendRecovery()}
            className="ko-btn-ghost !px-2.5 !py-1.5 text-xs"
          >
            <IconMail className="ko-icon-sm" />
            {busy === "email" ? "Envoi…" : "Envoyer un lien"}
          </button>
        </div>
        {message ? (
          <p className="mt-2 text-xs font-semibold text-emerald-700" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-xs font-semibold text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </>
  );
}
