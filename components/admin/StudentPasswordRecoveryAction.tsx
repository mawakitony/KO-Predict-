"use client";

import { useState } from "react";
import {
  ActivationCodeModal,
  type ActivationCodeModalData,
} from "@/components/admin/ActivationCodeModal";
import { IconMail, IconRefresh } from "@/components/admin/AdminIcons";
import { useLanguage } from "@/components/i18n/LanguageProvider";

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
  const { t } = useLanguage();
  const [busy, setBusy] = useState<"reset" | "email" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<ActivationCodeModalData | null>(null);

  if (!canManage || !studentId) return null;

  if (accountStatus === "DISABLED") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">
          {t("admin.file.accountAccess")}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {t("admin.file.reactivateFirst")}
        </p>
      </div>
    );
  }

  if (accountStatus !== "ACTIVE") {
    return null;
  }

  async function issueResetCode() {
    const ok = window.confirm(t("admin.learners.resetCodeConfirm"));
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
        setError(json?.error ?? t("admin.file.issueImpossible"));
        return;
      }
      setModal({
        fullName: json.fullName ?? fullName ?? "—",
        email: json.email ?? email ?? "—",
        activationCode: json.resetCode,
        expiresAt: json.resetExpiresAt,
      });
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusy(null);
    }
  }

  async function sendRecovery() {
    const displayEmail = email?.trim() || t("chrome.learnerFallback");
    const ok = window.confirm(
      t("admin.learners.recoveryConfirm", { email: displayEmail }),
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
        setError(json?.error ?? t("admin.learners.emailFail"));
        return;
      }
      setMessage(t("admin.learners.emailSent"));
    } catch {
      setError(t("common.networkError"));
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
          title={t("admin.learners.resetCodeTitle")}
          hint={t("admin.learners.resetCodeHint")}
        />
      ) : null}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">
          {t("admin.file.accountAccess")}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">
          {t("admin.file.accessHint")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void issueResetCode()}
            className="ko-btn-blue !px-2.5 !py-1.5 text-xs"
          >
            <IconRefresh className="ko-icon-sm" />
            {busy === "reset"
              ? t("admin.file.generating")
              : t("status.resetAccess")}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void sendRecovery()}
            className="ko-btn-ghost !px-2.5 !py-1.5 text-xs"
          >
            <IconMail className="ko-icon-sm" />
            {busy === "email" ? t("common.sending") : t("admin.file.sendEmailLink")}
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
