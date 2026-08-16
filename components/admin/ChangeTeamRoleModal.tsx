"use client";

import { useState, useTransition } from "react";
import type { TeamMemberRow } from "@/lib/admin/team-types";
import { roleLabelFr, type TeamCreatableRole } from "@/lib/auth/roles";
import {
  CHANGE_TEAM_ROLE_MFA_NEXT,
  formatTeamRoleTransitionSummary,
  mapChangeTeamRoleApiError,
} from "@/lib/admin/team-role-ui";

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
    : formatTeamRoleTransitionSummary(currentRole, selected);

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
        setError("Erreur réseau.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h2 className="ko-display text-lg font-semibold text-slate-900">
          Modifier le rôle
        </h2>

        <div className="mt-4 space-y-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Membre
          </p>
          <p className="font-semibold text-slate-900">{fullName}</p>
          <p className="truncate text-sm text-slate-500">
            {member.email ?? "—"}
          </p>
        </div>

        <p className="mt-4 text-sm text-slate-600">
          Rôle actuel :{" "}
          <span className="font-semibold text-slate-900">
            {roleLabelFr(currentRole)}
          </span>
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-slate-700">
            Nouveau rôle
          </legend>
          {(
            [
              { value: "coach", label: "Coach" },
              { value: "admin", label: "Administrateur" },
            ] as const
          ).map((option) => {
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
                {option.label}
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
            Sélectionnez un rôle différent pour activer la confirmation.
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
                Ouvrir la vérification en deux étapes
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
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending || unchanged}
            className="min-h-11 rounded-xl bg-[var(--admin-blue)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--admin-blue-hover)] disabled:opacity-50"
          >
            Confirmer le changement
          </button>
        </div>
      </form>
    </div>
  );
}
