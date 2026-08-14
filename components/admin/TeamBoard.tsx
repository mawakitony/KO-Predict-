"use client";

import { useMemo, useState, useTransition } from "react";
import type { TeamMemberRow } from "@/lib/admin/team-types";
import { roleLabelFr } from "@/lib/auth/roles";
import { formatDateFr, formatDateTimeFr } from "@/lib/dashboard/format";
import {
  ActivationCodeModal,
  type ActivationCodeModalData,
} from "@/components/admin/ActivationCodeModal";
import { IconPlus } from "@/components/admin/AdminIcons";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  DISABLED: "Désactivé",
  PENDING_ACTIVATION: "En attente d’activation",
};

interface TeamBoardProps {
  initialMembers: TeamMemberRow[];
  currentUserId: string;
}

export function TeamBoard({ initialMembers, currentUserId }: TeamBoardProps) {
  const [members, setMembers] = useState(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<ActivationCodeModalData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"coach" | "admin">("coach");

  const sorted = useMemo(
    () =>
      [...members].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [members],
  );

  async function refresh() {
    const res = await fetch("/api/admin/team", { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json.ok) {
      setMembers(json.members);
    }
  }

  function submitCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/team/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, role }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Création impossible.");
        return;
      }
      setModal({
        fullName: `${firstName} ${lastName}`.trim(),
        email: json.email,
        activationCode: json.activationCode,
        expiresAt: json.expiresAt,
      });
      setShowForm(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("coach");
      await refresh();
    });
  }

  async function runAction(
    profileId: string,
    path: string,
    body: Record<string, unknown>,
  ) {
    setBusyId(profileId);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Action échouée.");
      } else {
        await refresh();
      }
    } catch {
      setError("Erreur réseau.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-[family-name:var(--font-outfit)] text-lg font-semibold text-slate-900">
            Équipe WOLOYEM
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Coachs et admins — comptes séparés des apprenants LearnWorlds.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="ko-btn-blue"
        >
          {!showForm ? <IconPlus className="ko-icon-sm" /> : null}
          {showForm ? "Fermer" : "Ajouter un membre"}
        </button>
      </div>

      {showForm ? (
        <form
          onSubmit={submitCreate}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-slate-600">
              Prénom
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm text-slate-600">
              Nom
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm text-slate-600">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            />
          </label>
          <label className="block text-sm text-slate-600">
            Rôle
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value === "admin" ? "admin" : "coach")
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="coach">Coach</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit" disabled={pending} className="ko-btn-blue">
            {pending ? "Création…" : "Créer et générer le code"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Nom</th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Rôle</th>
              <th className="px-4 py-3 font-semibold">Statut</th>
              <th className="px-4 py-3 font-semibold">Créé</th>
              <th className="px-4 py-3 font-semibold">Dernière connexion</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((m) => {
              const fullName =
                [m.firstName, m.lastName].filter(Boolean).join(" ") || "—";
              const isSelf = m.id === currentUserId;
              const isSuper = m.role === "super_admin";
              return (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {fullName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.email ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {roleLabelFr(m.role)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      {STATUS_LABEL[m.accountStatus] ?? m.accountStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateFr(m.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {m.lastSignInAt
                      ? formatDateTimeFr(m.lastSignInAt)
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {isSuper || isSelf ? (
                      <span className="text-xs text-slate-400">—</span>
                    ) : (
                      <div className="flex flex-col items-start gap-1">
                        {m.accountStatus === "ACTIVE" ||
                        m.accountStatus === "PENDING_ACTIVATION" ? (
                          <button
                            type="button"
                            disabled={busyId === m.id}
                            onClick={() => {
                              if (
                                !window.confirm(
                                  "Désactiver ce membre d’équipe ?",
                                )
                              ) {
                                return;
                              }
                              void runAction(m.id, "/api/admin/team/disable", {
                                profileId: m.id,
                              });
                            }}
                            className="text-xs font-semibold text-slate-600 hover:underline disabled:opacity-50"
                          >
                            Désactiver
                          </button>
                        ) : null}
                        {m.accountStatus === "DISABLED" ? (
                          <button
                            type="button"
                            disabled={busyId === m.id}
                            onClick={() =>
                              void runAction(m.id, "/api/admin/team/enable", {
                                profileId: m.id,
                              })
                            }
                            className="text-xs font-semibold text-[var(--accent-hover)] hover:underline disabled:opacity-50"
                          >
                            Réactiver
                          </button>
                        ) : null}
                        {m.role === "coach" ? (
                          <button
                            type="button"
                            disabled={busyId === m.id}
                            onClick={() =>
                              void runAction(
                                m.id,
                                "/api/admin/team/change-role",
                                { profileId: m.id, newRole: "admin" },
                              )
                            }
                            className="text-xs font-semibold text-slate-600 hover:underline disabled:opacity-50"
                          >
                            Promouvoir Admin
                          </button>
                        ) : null}
                        {m.role === "admin" ? (
                          <button
                            type="button"
                            disabled={busyId === m.id}
                            onClick={() =>
                              void runAction(
                                m.id,
                                "/api/admin/team/change-role",
                                { profileId: m.id, newRole: "coach" },
                              )
                            }
                            className="text-xs font-semibold text-slate-600 hover:underline disabled:opacity-50"
                          >
                            Passer en Coach
                          </button>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modal ? (
        <ActivationCodeModal
          data={modal}
          onClose={() => setModal(null)}
          title="Code d’activation équipe"
          hint="Communiquez ce code une seule fois. Le membre finalise sur /first-access."
        />
      ) : null}
    </div>
  );
}
