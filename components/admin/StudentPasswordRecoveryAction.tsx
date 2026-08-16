"use client";

import { useState } from "react";
import { IconMail } from "@/components/admin/AdminIcons";

export function StudentPasswordRecoveryAction({
  studentId,
  email,
  accountStatus,
  canManage,
}: {
  studentId: string;
  email?: string | null;
  accountStatus?: string | null;
  canManage: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function sendRecovery() {
    const displayEmail = email?.trim() || "l’apprenant";
    const ok = window.confirm(
      `Cette action permettra à l’apprenant de définir un nouveau mot de passe. Un email de récupération sera envoyé à ${displayEmail}.`,
    );
    if (!ok) return;

    setBusy(true);
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
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <p className="text-sm font-semibold text-slate-800">Accès au compte</p>
      <p className="mt-1 text-xs font-medium text-slate-500">
        Mot de passe oublié : l’apprenant définira lui-même un nouveau mot de
        passe.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void sendRecovery()}
        className="ko-btn-ghost mt-3 !px-2.5 !py-1.5 text-xs"
      >
        <IconMail className="ko-icon-sm" />
        {busy ? "Envoi…" : "Envoyer un lien de réinitialisation"}
      </button>
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
  );
}
