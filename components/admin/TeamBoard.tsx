"use client";

import { useMemo, useState, useTransition } from "react";
import type { TeamMemberRow } from "@/lib/admin/team-types";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDate, formatDateTime } from "@/lib/i18n/format-date";
import { accountStatusKey, roleKey } from "@/lib/i18n/labels";
import {
  ActivationCodeModal,
  type ActivationCodeModalData,
} from "@/components/admin/ActivationCodeModal";
import { AddLearnWorldsCoachModal } from "@/components/admin/AddLearnWorldsCoachModal";
import { ChangeTeamRoleModal } from "@/components/admin/ChangeTeamRoleModal";
import {
  IconBanDuo,
  IconCheckDuo,
  IconMailDuo,
  IconPlus,
  IconTeamDuo,
  IconUserDuo,
} from "@/components/admin/AdminIcons";
import { AdminAvatar } from "@/components/admin/AdminUi";
import { AdminRowAction, AdminRowActions } from "@/components/admin/AdminRowActions";
import { canShowChangeTeamRoleAction } from "@/lib/admin/team-role-ui";
import {
  LW_SA_AUTH_SECTION_ID,
  resolveAdminPromoteLwAuthUiState,
  type LwSuperAdminAuthorizationListItem,
} from "@/lib/admin/learnworlds-super-admin-auth-ui";

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
  lwSuperAdminAuthorizations?: LwSuperAdminAuthorizationListItem[];
}

export function TeamBoard({
  initialMembers,
  currentUserId,
  lwSuperAdminAuthorizations = [],
}: TeamBoardProps) {
  const { t, locale } = useLanguage();
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
  const [roleChangeTarget, setRoleChangeTarget] =
    useState<TeamMemberRow | null>(null);

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
        setError(json.error ?? t("admin.team.createFail"));
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
        setError(json.error ?? t("common.actionFailed"));
      } else {
        await refresh();
      }
    } catch {
      setError(t("common.networkError"));
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
          setError(json.error ?? t("admin.team.promoteFail"));
          return;
        }
        closePromoteModal();
        await refresh();
      } catch {
        setError(t("common.networkError"));
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
              <IconTeamDuo className="ko-icon" />
            </span>
            <div>
              <h1 className="ko-display text-xl font-semibold text-slate-900">
                {t("admin.team.title")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {t("admin.team.subtitle")}
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
              <IconMailDuo className="ko-icon-sm" />
              {t("admin.team.addLwCoach")}
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
              {showForm ? t("admin.team.closeForm") : t("admin.team.addMember")}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="ko-interv-metric">
            <span className="ko-interv-metric-icon" data-tone="slate">
              <IconTeamDuo />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {t("admin.team.members")}
              </p>
              <p className="text-lg font-semibold leading-tight text-slate-900">
                {stats.total}
              </p>
            </div>
          </div>
          <div className="ko-interv-metric">
            <span className="ko-interv-metric-icon" data-tone="teal">
              <IconCheckDuo />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {t("status.activePlural")}
              </p>
              <p className="text-lg font-semibold leading-tight text-emerald-700">
                {stats.active}
              </p>
            </div>
          </div>
          <div className="ko-interv-metric">
            <span className="ko-interv-metric-icon" data-tone="blue">
              <IconUserDuo />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {t("role.coach")}
              </p>
              <p className="text-lg font-semibold leading-tight text-slate-900">
                {stats.coaches}
              </p>
            </div>
          </div>
          <div className="ko-interv-metric">
            <span className="ko-interv-metric-icon" data-tone="amber">
              <IconTeamDuo />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {t("role.admin")}
              </p>
              <p className="text-lg font-semibold leading-tight text-slate-900">
                {stats.admins}
              </p>
            </div>
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
              <IconUserDuo className="ko-icon text-[var(--admin-blue)]" />
              <h2 className="text-sm font-semibold text-slate-900">
                {t("admin.team.addMember")}
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-600">
                {t("admin.profile.firstName")}
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-blue)] focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-medium text-slate-600">
                {t("admin.profile.lastName")}
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-blue)] focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-600">
              {t("common.email")}
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-blue)] focus:ring-2 focus:ring-blue-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              {t("admin.team.changeRole")}
              <select
                value={role}
                onChange={(e) =>
                  setRole(e.target.value === "admin" ? "admin" : "coach")
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-blue)] focus:ring-2 focus:ring-blue-100"
              >
                <option value="coach">{t("role.coach")}</option>
                <option value="admin">{t("role.admin")}</option>
              </select>
            </label>
            <button type="submit" disabled={pending} className="ko-btn-blue">
              <IconCheckDuo className="ko-icon-sm" />
              {pending ? t("admin.team.creating") : t("admin.team.createCode")}
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
            <table className="w-full min-w-[64rem] table-fixed border-collapse text-left text-sm">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[20%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {t("admin.team.members")}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {t("common.email")}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {t("admin.team.changeRole")}
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {t("admin.learners.colAccess")}
                  </th>
                  <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 lg:table-cell">
                    {t("admin.team.colCreated")}
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                    {t("admin.learners.colAction")}
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
                  const promoteState =
                    m.role === "admin" && m.accountStatus === "ACTIVE"
                      ? resolveAdminPromoteLwAuthUiState({
                          memberEmail: m.email,
                          authorizations: lwSuperAdminAuthorizations,
                        })
                      : null;
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
                                ? t("admin.team.seen", {
                                    date: formatDateTime(m.lastSignInAt, locale),
                                  })
                                : t("admin.team.neverSignedIn")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <p className="flex items-center gap-1.5 truncate text-slate-600">
                          <span className="ko-interv-chip-icon bg-slate-100 text-slate-500">
                            <IconMailDuo />
                          </span>
                          <span className="truncate">{m.email ?? "—"}</span>
                        </p>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${roleClass}`}
                        >
                          {t(roleKey(m.role))}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
                          />
                          {t(accountStatusKey(m.accountStatus))}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3.5 align-middle text-slate-600 lg:table-cell">
                        <p>{formatDate(m.createdAt, locale)}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {m.lastSignInAt
                            ? t("admin.team.lastLogin", {
                                date: formatDateTime(m.lastSignInAt, locale),
                              })
                            : t("admin.team.neverSignedIn")}
                        </p>
                      </td>
                      <td className="px-3 py-3.5 align-middle sm:px-4">
                        {isSuper || isSelf ? (
                          <p className="text-right text-xs text-slate-400">
                            {isSelf ? t("admin.team.yourAccount") : t("admin.team.protected")}
                          </p>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            <AdminRowActions>
                              {m.accountStatus === "ACTIVE" ||
                              m.accountStatus === "PENDING_ACTIVATION" ? (
                                <AdminRowAction
                                  label={t("common.disable")}
                                  tone="danger"
                                  disabled={busyId === m.id}
                                  onClick={() => {
                                    if (
                                      !window.confirm(
                                        t("admin.team.disableMember"),
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
                                  icon={<IconBanDuo className="ko-icon-sm" />}
                                />
                              ) : null}
                              {m.accountStatus === "DISABLED" ? (
                                <AdminRowAction
                                  labeled
                                  label={t("common.reactivate")}
                                  tone="success"
                                  disabled={busyId === m.id}
                                  onClick={() =>
                                    void runAction(
                                      m.id,
                                      "/api/admin/team/enable",
                                      { profileId: m.id },
                                    )
                                  }
                                  icon={<IconCheckDuo className="ko-icon-sm" />}
                                />
                              ) : null}
                              {canShowChangeTeamRoleAction({
                                role: m.role,
                                accountStatus: m.accountStatus,
                                isSelf,
                              }) ? (
                                <AdminRowAction
                                  label={t("admin.team.changeRole")}
                                  tone="primary"
                                  disabled={busyId === m.id}
                                  onClick={() => {
                                    setError(null);
                                    setRoleChangeTarget(m);
                                  }}
                                  icon={<IconUserDuo className="ko-icon-sm" />}
                                />
                              ) : null}
                              {promoteState === "can_promote" ? (
                                <AdminRowAction
                                  label={t("admin.team.superAdmin")}
                                  tone="violet"
                                  disabled={busyId === m.id}
                                  onClick={() => openPromoteModal(m)}
                                  icon={<IconTeamDuo className="ko-icon-sm" />}
                                />
                              ) : null}
                            </AdminRowActions>
                            {promoteState === "auth_revoked" ? (
                              <p className="max-w-[20rem] text-right text-xs leading-snug text-amber-800">
                                {t("admin.team.lwAuthRevoked")}{" "}
                                <a
                                  href={`#${LW_SA_AUTH_SECTION_ID}`}
                                  className="font-semibold underline"
                                >
                                  {t("admin.team.lwAuthRevokedLink")}
                                </a>
                              </p>
                            ) : null}
                            {promoteState === "auth_required" ? (
                              <p className="max-w-[20rem] text-right text-xs leading-snug text-slate-500">
                                {t("admin.team.lwAuthRequired")}{" "}
                                <a
                                  href={`#${LW_SA_AUTH_SECTION_ID}`}
                                  className="font-semibold text-violet-800 underline"
                                >
                                  {t("admin.team.lwAuthRequiredLink")}
                                </a>
                              </p>
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
          title={t("admin.team.activationTitle")}
          hint={t("admin.team.activationHint")}
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

      {roleChangeTarget ? (
        <ChangeTeamRoleModal
          member={roleChangeTarget}
          onClose={() => setRoleChangeTarget(null)}
          onChanged={async () => {
            await refresh();
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
              {t("admin.team.promoteTitle")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t("admin.team.promoteBody", {
                name:
                  [promoteTarget.firstName, promoteTarget.lastName]
                    .filter(Boolean)
                    .join(" ") || t("admin.team.promoteTargetFallback"),
              })}
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              {t("admin.team.promoteEmail")}
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
                {t("admin.team.promoteAck")}
              </span>
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={closePromoteModal}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t("common.cancel")}
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
                {t("admin.team.promoteConfirm")}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
