"use client";

import { useState, useTransition } from "react";
import type { TeamMemberRow } from "@/lib/admin/team-types";
import { type TeamCreatableRole } from "@/lib/auth/roles";
import {
  CHANGE_TEAM_ROLE_MFA_NEXT,
  mapChangeTeamRoleApiError,
} from "@/lib/admin/team-role-ui";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { roleKey } from "@/lib/i18n/labels";

interface ChangeTeamRoleModalProps {
  member: TeamMemberRow;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}

export function ChangeTeamRoleModal({
  member,
  onClose,
  onChanged,
}: ChangeTeamRoleModalProps) {
  const { t } = useLanguage();
  const currentRole = member.role as TeamCreatableRole;
  const [selected, setSelected] = useState<TeamCreatableRole>(currentRole);
  const [error, setError] = useState<string | null>(null);
  const [mfaHref, setMfaHref] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fullName =
    [member.firstName, member.lastName].filter(Boolean).join(" ") || "—";
  const unchanged = selected === currentRole;
  const summary = unchanged
    ? null
    : `${t(roleKey(currentRole))} → ${t(roleKey(selected))}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (unchanged) return;
    setError(null);
    setMfaHref(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/team/change-role", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: member.id,
            newRole: selected,
          }),
        });
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          reasonCode?: string;
          code?: string;
        } | null;
        if (!res.ok || !json?.ok) {
          const mapped = mapChangeTeamRoleApiError({
            status: res.status,
            body: json,
          });
          setError(mapped.message);
          if (mapped.needsMfaChallenge) {
            setMfaHref(
              `/auth/mfa/challenge?next=${encodeURIComponent(CHANGE_TEAM_ROLE_MFA_NEXT)}`,
            );
          }
          return;
        }
        await onChanged();
        onClose();
      } catch {
        setError(t("common.networkError"));
      }
    });
  }

  const roleOptions: Array<{ value: TeamCreatableRole; labelKey: ReturnType<typeof roleKey> }> = [
    { value: "coach", labelKey: roleKey("coach") },
    { value: "admin", labelKey: roleKey("admin") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h2 className="ko-display text-lg font-semibold text-slate-900">
          {t("admin.modal.changeRoleTitle")}
        </h2>

        <div className="mt-4 space-y-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {t("admin.team.members")}
          </p>
          <p className="font-semibold text-slate-900">{fullName}</p>
          <p className="truncate text-sm text-slate-500">
            {member.email ?? "—"}
          </p>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          {t("admin.team.currentRole", { role: t(roleKey(currentRole)) })}
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-slate-700">
            {t("admin.team.changeRole")}
          </legend>
          {roleOptions.map((option) => {
            const active = selected === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
                  active
                    ? "border-blue-300 bg-blue-50 text-blue-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="newRole"
                  value={option.value}
                  checked={active}
                  onChange={() => setSelected(option.value)}
                  className="h-4 w-4 border-slate-300 text-blue-600"
                />
                {t(option.labelKey)}
              </label>
            );
          })}
        </fieldset>

        {summary ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-950">
            {summary}
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            {t("admin.team.selectDifferentRole")}
          </p>
        )}

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

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={pending || unchanged}
            className="min-h-11 rounded-xl bg-[var(--admin-blue)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-blue-hover)] disabled:opacity-50"
          >
            {t("admin.team.confirmChange")}
          </button>
        </div>
      </form>
    </div>
  );
}
