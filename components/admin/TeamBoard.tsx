"use client";

import { useMemo, useState, useTransition } from "react";
import type { TeamMemberRow } from "@/lib/admin/team-types";
import { roleLabelFr } from "@/lib/auth/roles";
import { formatDateFr, formatDateTimeFr } from "@/lib/dashboard/format";
import {
  ActivationCodeModal,
  type ActivationCodeModalData,
} from "@/components/admin/ActivationCodeModal";
import { AddLearnWorldsCoachModal } from "@/components/admin/AddLearnWorldsCoachModal";
import {
  IconBan,
  IconCheck,
  IconMail,
  IconPlus,
  IconTeam,
  IconUser,
} from "@/components/admin/AdminIcons";
import { AdminAvatar } from "@/components/admin/AdminUi";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Actif",
  DISABLED: "Désactivé",
  PENDING_ACTIVATION: "En attente",
};

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  DISABLED: "bg-rose-50 text-rose-700 ring-rose-200",
  PENDING_ACTIVATION: "bg-amber-50 text-amber-900 ring-amber-200",
};

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-emerald-500",
  DISABLED: "bg-rose-500",
  PENDING_ACTIVATION: "bg-amber-500",
};

const ROLE_CLASS: Record<string, string> = {
  super_admin: "bg-violet-50 text-violet-800 ring-violet-200",
  admin: "bg-blue-50 text-blue-800 ring-blue-200",
  coach: "bg-slate-100 text-slate-700 ring-slate-200",
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
  const [promoteTarget, setPromoteTarget] = useState<TeamMemberRow | null>(
    null,
  );
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promoteAck, setPromoteAck] = useState(false);
  const [showLwCoachModal, setShowLwCoachModal] = useState(false);

  const sorted = useMemo(
    () => [...members].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [members],
  );

  const stats = useMemo(() => {
    let active = 0;
    let coaches = 0;
    let admins = 0;
    for (const m of members) {
      if (m.accountStatus === "ACTIVE") active += 1;
      if (m.role === "coach") coaches += 1;
      if (m.role === "admin" || m.role === "super_admin") admins += 1;
    }
    return { total: members.length, active, coaches, admins };
  }, [members]);

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

  function openPromoteModal(member: TeamMemberRow) {
    setError(null);
    setPromoteTarget(member);
    setPromoteEmail("");
    setPromoteAck(false);
  }

  function closePromoteModal() {
    setPromoteTarget(null);
    setPromoteEmail("");
    setPromoteAck(false);
  }

  function submitPromote(e: React.FormEvent) {
    e.preventDefault();
    if (!promoteTarget) return;
    setError(null);
    startTransition(async () => {
      setBusyId(promoteTarget.id);
      try {
        const res = await fetch("/api/admin/team/promote-super-admin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: promoteTarget.id,
            confirmEmail: promoteEmail,
            confirmAcknowledged: promoteAck === true ? true : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Promotion impossible.");
          return;
        }
        closePromoteModal();
        await refresh();
      } catch {
        setError("Erreur réseau.");
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.28)]">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--admin-blue)] text-white shadow-[0_10px_20px_-12px_rgba(37,99,235,0.9)]">
              <IconTeam className="ko-icon" />
            </span>
            <div>
              <h1 className="ko-display text-xl font-semibold text-slate-900">
                Équipe WOLOYEM
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Coachs et admins — comptes séparés des apprenants LearnWorlds.
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 self-start sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setShowLwCoachModal(true);
              }}
              className="ko-btn-blue-soft w-full min-h-11 justify-center sm:w-auto"
            >
              <IconMail className="ko-icon-sm" />
              Ajouter un coach LearnWorlds
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLwCoachModal(false);
                setShowForm((v) => !v);
              }}
              className="ko-btn-blue w-full min-h-11 justify-center sm:w-auto"
            >
              {!showForm ? <IconPlus className="ko-icon-sm" /> : null}
              {showForm ? "Fermer le formulaire" : "Ajouter un membre"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Membres
            </p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">
              {stats.total}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Actifs
            </p>
            <p className="mt-0.5 text-lg font-semibold text-emerald-700">
              {stats.active}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Coachs
            </p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">
              {stats.coaches}
            </p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Admins
            </p>
            <p className="mt-0.5 text-lg font-semibold text-slate-900">
              {stats.admins}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-6">
        {showForm ? (
          <form
            onSubmit={submitCreate}
            className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 sm:p-5"
          >
            <div className="flex items-center gap-2">
              <IconUser className="ko-icon text-[var(--admin-blue)]" />
              <h2 className="text-sm font-semibold text-slate-900">
                Nouveau membre d’équipe
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                Prénom
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-blue)] focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-medium text-slate-600">
                Nom
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-blue)] focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-600">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-blue)] focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              Rôle
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value === "admin" ? "admin" : "coach")
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-blue)] focus:ring-2 focus:ring-blue-100"
              >
                <option value="coach">Coach</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <button type="submit" disabled={pending} className="ko-btn-blue">
              <IconCheck className="ko-icon-sm" />
              {pending ? "Création…" : "Créer et générer le code"}
            </button>
          </form>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200/90">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[22%]" />
                <col className="w-[14%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Membre
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Email
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Rôle
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Statut
                  </th>
                  <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 lg:table-cell">
                    Créé
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.map((m) => {
                  const fullName =
                    [m.firstName, m.lastName].filter(Boolean).join(" ") || "—";
                  const isSelf = m.id === currentUserId;
                  const isSuper = m.role === "super_admin";
                  const statusClass =
                    STATUS_CLASS[m.accountStatus] ?? STATUS_CLASS.ACTIVE;
                  const statusDot =
                    STATUS_DOT[m.accountStatus] ?? STATUS_DOT.ACTIVE;
                  const roleClass =
                    ROLE_CLASS[m.role] ?? ROLE_CLASS.coach;
                  return (
                    <tr
                      key={m.id}
                      className="transition-colors hover:bg-blue-50/40"
                    >
                      <td className="px-4 py-3.5 align-middle">
                        <div className="flex min-w-0 items-center gap-3">
                          <AdminAvatar name={fullName} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {fullName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-400 lg:hidden">
                              {m.lastSignInAt
                                ? `Vu ${formatDateTimeFr(m.lastSignInAt)}`
                                : "Jamais connecté"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="flex items-center gap-1.5 truncate text-slate-600">
                          <IconMail className="ko-icon-sm shrink-0 text-slate-300" />
                          <span className="truncate">{m.email ?? "—"}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${roleClass}`}
                        >
                          {roleLabelFr(m.role)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
                          />
                          {STATUS_LABEL[m.accountStatus] ?? m.accountStatus}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3.5 align-middle text-slate-600 lg:table-cell">
                        <p>{formatDateFr(m.createdAt)}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {m.lastSignInAt
                            ? `Connexion ${formatDateTimeFr(m.lastSignInAt)}`
                            : "Jamais connecté"}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        {isSuper || isSelf ? (
                          <p className="text-right text-xs text-slate-400">
                            {isSelf ? "Votre compte" : "Protégé"}
                          </p>
                        ) : (
                          <div className="flex flex-wrap items-center justify-end gap-1.5">
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
                                  void runAction(
                                    m.id,
                                    "/api/admin/team/disable",
                                    { profileId: m.id },
                                  );
                                }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <IconBan className="ko-icon-sm" />
                                Désactiver
                              </button>
                            ) : null}
                            {m.accountStatus === "DISABLED" ? (
                              <button
                                type="button"
                                disabled={busyId === m.id}
                                onClick={() =>
                                  void runAction(
                                    m.id,
                                    "/api/admin/team/enable",
                                    { profileId: m.id },
                                  )
                                }
                                className="inline-flex items-center gap-1 rounded-lg bg-[var(--admin-blue)] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--admin-blue-hover)] disabled:opacity-50"
                              >
                                <IconCheck className="ko-icon-sm" />
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
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                              >
                                <IconTeam className="ko-icon-sm" />
                                Admin
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
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                <IconUser className="ko-icon-sm" />
                                Coach
                              </button>
                            ) : null}
                            {m.role === "admin" &&
                            m.accountStatus === "ACTIVE" ? (
                              <button
                                type="button"
                                disabled={busyId === m.id}
                                onClick={() => openPromoteModal(m)}
                                className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-100 disabled:opacity-50"
                              >
                                <IconTeam className="ko-icon-sm" />
                                Super admin
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
        </div>
      </div>

      {modal ? (
        <ActivationCodeModal
          data={modal}
          onClose={() => setModal(null)}
          title="Code d’activation équipe"
          hint="Communiquez ce code une seule fois. Le membre finalise sur /first-access."
        />
      ) : null}

      {showLwCoachModal ? (
        <AddLearnWorldsCoachModal
          onClose={() => setShowLwCoachModal(false)}
          onCreated={(payload) => {
            setShowLwCoachModal(false);
            setModal({
              fullName: payload.fullName,
              email: payload.email,
              activationCode: payload.activationCode,
              expiresAt: payload.expiresAt,
            });
            void refresh();
          }}
        />
      ) : null}

      {promoteTarget ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <form
            onSubmit={submitPromote}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <h2 className="ko-display text-lg font-semibold text-slate-900">
              Promouvoir en super administrateur
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Cette action est irréversible via l’interface V1. Le compte{" "}
              <span className="font-semibold text-slate-900">
                {[promoteTarget.firstName, promoteTarget.lastName]
                  .filter(Boolean)
                  .join(" ") || "cible"}
              </span>{" "}
              passera de admin à super_admin.
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Recopiez l’email exact
              <input
                type="email"
                required
                autoComplete="off"
                value={promoteEmail}
                onChange={(e) => setPromoteEmail(e.target.value)}
                placeholder={promoteTarget.email ?? "email@exemple.com"}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-base outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
              />
            </label>
            <label className="mt-4 flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={promoteAck}
                onChange={(e) => setPromoteAck(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <span>
                Je confirme promouvoir ce compte admin ACTIVE en super_admin KO
                Predict™. Je comprends que LearnWorlds n’intervient pas.
              </span>
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closePromoteModal}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={
                  pending ||
                  busyId === promoteTarget.id ||
                  !promoteAck ||
                  !promoteEmail.trim()
                }
                className="rounded-xl bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
              >
                Confirmer la promotion
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
