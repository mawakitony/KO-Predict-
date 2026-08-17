"use client";

import { useState, useTransition } from "react";
import {
  formatLwIdentityLabel,
  LW_SA_AUTH_MFA_NEXT,
  mapLwSuperAdminAuthApiError,
} from "@/lib/admin/learnworlds-super-admin-auth-ui";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { IconCheck, IconMail } from "@/components/admin/AdminIcons";

type LookupIdentity = {
  learnworldsUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  roleLevel: string | null;
  roleName: string | null;
  isAdmin: boolean;
  isInstructor: boolean;
};

type LookupOk = {
  ok: true;
  email: string;
  found: true;
  identity: LookupIdentity;
};

interface AuthorizeLearnWorldsSuperAdminModalProps {
  onClose: () => void;
  onAuthorized: () => void | Promise<void>;
}

export function AuthorizeLearnWorldsSuperAdminModal({
  onClose,
  onAuthorized,
}: AuthorizeLearnWorldsSuperAdminModalProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState<LookupOk | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaHref, setMfaHref] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "lookup" | "create">("idle");
  const [pending, startTransition] = useTransition();

  function handleApiError(
    status: number,
    body: { error?: string; reasonCode?: string; code?: string } | null,
  ) {
    const mapped = mapLwSuperAdminAuthApiError({ status, body });
    setError(mapped.message);
    setMfaHref(
      mapped.needsMfaChallenge
        ? `/auth/mfa/challenge?next=${encodeURIComponent(LW_SA_AUTH_MFA_NEXT)}`
        : null,
    );
  }

  function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMfaHref(null);
    setLookup(null);
    setConfirmed(false);
    setPhase("lookup");
    startTransition(async () => {
      try {
        const res = await fetch(
          "/api/admin/team/learnworlds/super-admin-auth/lookup",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          },
        );
        const json = (await res.json().catch(() => null)) as
          | LookupOk
          | {
              ok: true;
              email: string;
              found: false;
              identity: null;
            }
          | { ok: false; error?: string; reasonCode?: string }
          | null;

        if (!res.ok || !json || !json.ok) {
          handleApiError(
            res.status,
            json && "ok" in json && !json.ok ? json : null,
          );
          return;
        }

        if (!json.found || !json.identity) {
          setError(t("admin.team.lwNotFound"));
          return;
        }

        setLookup({
          ok: true,
          email: json.email,
          found: true,
          identity: json.identity,
        });
      } catch {
        setError(t("common.networkError"));
      } finally {
        setPhase("idle");
      }
    });
  }

  function onAuthorize() {
    if (!lookup || !confirmed) return;
    setError(null);
    setMfaHref(null);
    setPhase("create");
    startTransition(async () => {
      try {
        const res = await fetch(
          "/api/admin/team/learnworlds/super-admin-auth",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: lookup.email,
              expectedLearnWorldsUserId: lookup.identity.learnworldsUserId,
            }),
          },
        );
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          reasonCode?: string;
        } | null;

        if (!res.ok || !json?.ok) {
          handleApiError(res.status, json);
          return;
        }

        await onAuthorized();
        onClose();
      } catch {
        setError(t("common.networkError"));
      } finally {
        setPhase("idle");
      }
    });
  }

  const identity = lookup?.identity ?? null;
  const displayName = identity
    ? formatLwIdentityLabel({
        firstName: identity.firstName,
        lastName: identity.lastName,
        email: lookup!.email,
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
        <h2 className="ko-display text-lg font-semibold text-slate-900">
          {t("admin.team.lwAuthAuthorize")}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {t("admin.team.lwAuthModalHint")}
        </p>

        <form onSubmit={onVerify} className="mt-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">
            {t("admin.team.lwEmail")}
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLookup(null);
                setConfirmed(false);
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              placeholder="personne@woloyem.com"
              autoComplete="off"
            />
          </label>
          <button
            type="submit"
            disabled={pending || phase === "lookup" || !email.trim()}
            className="ko-btn-blue-soft inline-flex min-h-11 w-full items-center justify-center gap-2 disabled:opacity-50"
          >
            <IconMail className="ko-icon-sm" />
            {phase === "lookup" && pending
              ? t("common.verifying")
              : t("admin.team.lwVerify")}
          </button>
        </form>

        {identity && lookup ? (
          <div className="mt-4 space-y-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {t("admin.team.lwIdentityTitle")}
              </p>
              <p className="font-semibold text-slate-900">{displayName}</p>
              <p className="truncate text-sm text-slate-500">{lookup.email}</p>
            </div>
            <p className="text-sm text-slate-600">
              {t("admin.team.lwRoleLevel")} :{" "}
              <span className="font-semibold text-slate-900">
                {identity.roleLevel ?? "—"}
              </span>
              <span className="text-slate-400">
                {" "}
                ({t("admin.team.lwRoleInfo")})
              </span>
            </p>
            <p className="break-all text-xs text-slate-500">
              {t("admin.team.lwIdLabel", { id: identity.learnworldsUserId })}
            </p>
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950">
              {t("admin.team.lwNotPromotion")}
            </p>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>
                {t("admin.team.lwAuthAck")}
              </span>
            </label>
            <button
              type="button"
              disabled={pending || !confirmed || phase === "create"}
              onClick={onAuthorize}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
            >
              <IconCheck className="ko-icon-sm" />
              {t("admin.team.lwAuthCreate")}
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            <p>{error}</p>
            {mfaHref ? (
              <a
                href={mfaHref}
                className="mt-2 inline-flex font-semibold text-rose-900 underline"
              >
                {t("admin.team.openMfa")}
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
