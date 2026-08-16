"use client";

import { useMemo, useState, useTransition } from "react";
import {
  LW_SA_AUTH_MFA_NEXT,
  LW_SA_AUTH_REVOKE_NOTICE,
  LW_SA_AUTH_SECTION_ID,
  mapLwSuperAdminAuthApiError,
  type LwSuperAdminAuthorizationListItem,
} from "@/lib/admin/learnworlds-super-admin-auth-ui";
import { formatDateTimeFr } from "@/lib/dashboard/format";
import { AuthorizeLearnWorldsSuperAdminModal } from "@/components/admin/AuthorizeLearnWorldsSuperAdminModal";
import { IconBan, IconPlus, IconTeam } from "@/components/admin/AdminIcons";

interface LearnWorldsSuperAdminAuthorizationsPanelProps {
  initialAuthorizations: LwSuperAdminAuthorizationListItem[];
}

export function LearnWorldsSuperAdminAuthorizationsPanel({
  initialAuthorizations,
}: LearnWorldsSuperAdminAuthorizationsPanelProps) {
  const [items, setItems] = useState(initialAuthorizations);
  const [error, setError] = useState<string | null>(null);
  const [mfaHref, setMfaHref] = useState<string | null>(null);
  const [showAuthorize, setShowAuthorize] = useState(false);
  const [revokeTarget, setRevokeTarget] =
    useState<LwSuperAdminAuthorizationListItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items],
  );

  async function refresh() {
    const res = await fetch(
      "/api/admin/team/learnworlds/super-admin-auth",
      { cache: "no-store" },
    );
    const json = await res.json().catch(() => null);
    if (res.ok && json?.ok && Array.isArray(json.authorizations)) {
      setItems(json.authorizations);
    }
  }

  function submitRevoke(e: React.FormEvent) {
    e.preventDefault();
    if (!revokeTarget) return;
    setError(null);
    setMfaHref(null);
    setBusyId(revokeTarget.id);
    startTransition(async () => {
      try {
        const res = await fetch(
          "/api/admin/team/learnworlds/super-admin-auth/revoke",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ authorizationId: revokeTarget.id }),
          },
        );
        const json = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          reasonCode?: string;
        } | null;

        if (!res.ok || !json?.ok) {
          const mapped = mapLwSuperAdminAuthApiError({
            status: res.status,
            body: json,
          });
          setError(mapped.message);
          if (mapped.needsMfaChallenge) {
            setMfaHref(
              `/auth/mfa/challenge?next=${encodeURIComponent(LW_SA_AUTH_MFA_NEXT)}`,
            );
          }
          return;
        }

        setRevokeTarget(null);
        await refresh();
      } catch {
        setError("Erreur réseau.");
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-[0_12px_40px_-24px_rgba(76,29,149,0.35)]">
      <div
        id={LW_SA_AUTH_SECTION_ID}
        className="scroll-mt-24 border-b border-violet-100 bg-gradient-to-r from-violet-50 via-white to-slate-50 px-4 py-5 sm:px-6"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-700 text-white shadow-[0_10px_20px_-12px_rgba(91,33,182,0.9)]">
              <IconTeam className="ko-icon" />
            </span>
            <div>
              <h2 className="ko-display text-xl font-semibold text-slate-900">
                Autorisations Super Admin LearnWorlds
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Éligibilité explicite uniquement — jamais une promotion
                automatique de rôle KO Predict™.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setMfaHref(null);
              setShowAuthorize(true);
            }}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800 sm:w-auto"
          >
            <IconPlus className="ko-icon-sm" />
            Autoriser un Super Admin LearnWorlds
          </button>
        </div>
      </div>

      {error ? (
        <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:px-6">
          <p>{error}</p>
          {mfaHref ? (
            <a
              href={mfaHref}
              className="mt-1 inline-flex font-semibold underline"
            >
              Ouvrir la vérification en deux étapes
            </a>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3">Email / identité</th>
              <th className="px-4 py-3">LearnWorlds ID</th>
              <th className="px-4 py-3">Statut</th>
              <th className="hidden px-4 py-3 lg:table-cell">Dates</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-slate-500"
                >
                  Aucune autorisation pour le moment.
                </td>
              </tr>
            ) : (
              sorted.map((row) => {
                const isActive = row.status === "ACTIVE";
                return (
                  <tr key={row.id} className="hover:bg-violet-50/30">
                    <td className="px-4 py-3.5 align-middle">
                      <p className="font-semibold text-slate-900">
                        {row.email}
                      </p>
                      {row.note ? (
                        <p className="mt-0.5 text-xs text-slate-400">
                          {row.note}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Identité LW : {row.email}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <p className="max-w-[10rem] truncate font-mono text-xs text-slate-600 sm:max-w-none">
                        {row.learnworldsUserId ?? "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                          isActive
                            ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-slate-200"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3.5 align-middle text-slate-600 lg:table-cell">
                      <p>Autorisé {formatDateTimeFr(row.createdAt)}</p>
                      {row.revokedAt ? (
                        <p className="mt-0.5 text-xs text-slate-400">
                          Révoqué {formatDateTimeFr(row.revokedAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 align-middle text-right">
                      {isActive ? (
                        <button
                          type="button"
                          disabled={busyId === row.id || pending}
                          onClick={() => {
                            setError(null);
                            setMfaHref(null);
                            setRevokeTarget(row);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                        >
                          <IconBan className="ko-icon-sm" />
                          Révoquer
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showAuthorize ? (
        <AuthorizeLearnWorldsSuperAdminModal
          onClose={() => setShowAuthorize(false)}
          onAuthorized={async () => {
            setShowAuthorize(false);
            await refresh();
          }}
        />
      ) : null}

      {revokeTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <form
            onSubmit={submitRevoke}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h3 className="ko-display text-lg font-semibold text-slate-900">
              Révoquer l’autorisation
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Email :{" "}
              <span className="font-semibold text-slate-900">
                {revokeTarget.email}
              </span>
            </p>
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-medium text-amber-950">
              {LW_SA_AUTH_REVOKE_NOTICE}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setRevokeTarget(null)}
                disabled={pending}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={pending || busyId === revokeTarget.id}
                className="min-h-11 rounded-xl bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
              >
                Confirmer la révocation
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
