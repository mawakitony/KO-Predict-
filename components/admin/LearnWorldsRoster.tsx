"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { LearnWorldsRosterPage } from "@/lib/admin/types";
import { adminStudentDetailHref } from "@/lib/admin/types";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDate } from "@/lib/i18n/format-date";
import {
  accountStatusKey,
  accountStatusTabKey,
} from "@/lib/i18n/labels";
import {
  ActivationCodeModal,
  type ActivationCodeModalData,
} from "@/components/admin/ActivationCodeModal";
import { AccountStatusBadge, AdminAvatar } from "@/components/admin/AdminUi";
import {
  IconBan,
  IconCheck,
  IconEye,
  IconFilter,
  IconMail,
  IconMore,
  IconRefresh,
  IconSearch,
  IconSort,
} from "@/components/admin/AdminIcons";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminRowAction, AdminRowActions } from "@/components/admin/AdminRowActions";

type RosterSort = "name-asc" | "name-desc" | "date-asc" | "date-desc";
type MenuId = "filter" | "sort" | "more" | null;

const STATUS_TAB_VALUES = [
  "ALL",
  "ACTIVE",
  "PENDING_ACTIVATION",
  "NOT_ACTIVATED",
  "DISABLED",
  "ERROR",
] as const;

export function LearnWorldsRoster({
  canManageStudents = false,
}: {
  canManageStudents?: boolean;
}) {
  const { t, locale } = useLanguage();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [sort, setSort] = useState<RosterSort>("name-asc");
  const [data, setData] = useState<LearnWorldsRosterPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successFlash, setSuccessFlash] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<
    (ActivationCodeModalData & { title?: string; hint?: string }) | null
  >(null);
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [menuNote, setMenuNote] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const searchInputId = useId();

  const statusTabs = useMemo(
    () =>
      STATUS_TAB_VALUES.map((value) => ({
        value,
        label:
          value === "ALL"
            ? t("common.all")
            : t(accountStatusTabKey(value)),
      })),
    [t],
  );

  const sortOptions = useMemo(
    (): Array<{ value: RosterSort; label: string }> => [
      { value: "name-asc", label: t("admin.learners.sortNameAsc") },
      { value: "name-desc", label: t("admin.learners.sortNameDesc") },
      { value: "date-desc", label: t("admin.learners.sortDateDesc") },
      { value: "date-asc", label: t("admin.learners.sortDateAsc") },
    ],
    [t],
  );

  const load = useCallback(
    (signal?: AbortSignal, fresh = false) => {
      startTransition(async () => {
        setError(null);
        const params = new URLSearchParams({
          page: String(page),
          status,
          q: query,
          sort,
        });
        if (fresh) params.set("fresh", "1");
        try {
          const res = await fetch(`/api/admin/learnworlds/users?${params}`, {
            cache: "no-store",
            signal,
          });
          const json = await res.json();
          if (signal?.aborted) return;
          if (!res.ok || !json.ok) {
            setError(json.error ?? t("admin.learners.loadError"));
            return;
          }
          setData(json);
        } catch (err) {
          if (signal?.aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(t("common.networkError"));
        }
      });
    },
    [page, status, query, sort, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!openMenu) return;
    function onPointerDown(event: MouseEvent) {
      if (!toolbarRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  useEffect(() => {
    if (!menuNote) return;
    const t = window.setTimeout(() => setMenuNote(null), 2200);
    return () => window.clearTimeout(t);
  }, [menuNote]);

  /** Recherche live : debounce pour limiter les appels API. */
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = draftQuery.trim();
      if (next === query) return;
      setPage(1);
      setQuery(next);
    }, 450);
    return () => window.clearTimeout(handle);
  }, [draftQuery, query]);

  function openCodeModal(
    row: { fullName: string; email: string | null },
    activationCode: string,
    expiresAt: string,
    options?: { title?: string; hint?: string },
  ) {
    setModal({
      fullName: row.fullName,
      email: row.email ?? "—",
      activationCode,
      expiresAt,
      title: options?.title,
      hint: options?.hint,
    });
  }

  async function runActivate(row: {
    learnworldsUserId: string;
    fullName: string;
    email: string | null;
  }) {
    setBusyId(row.learnworldsUserId);
    setError(null);
    try {
      const res = await fetch("/api/admin/learnworlds/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learnworldsUserId: row.learnworldsUserId }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? t("common.actionFailed"));
      } else if (json.activationCode && json.activationExpiresAt) {
        openCodeModal(row, json.activationCode, json.activationExpiresAt);
      }
      load(undefined, true);
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusyId(null);
    }
  }

  async function runRegenerate(row: {
    studentId: string;
    fullName: string;
    email: string | null;
  }) {
    setBusyId(row.studentId);
    setError(null);
    try {
      const res = await fetch(
        "/api/admin/students/regenerate-activation-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: row.studentId }),
        },
      );
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? t("admin.learners.regenerateFail"));
      } else if (json.activationCode && json.activationExpiresAt) {
        openCodeModal(
          {
            fullName: json.fullName ?? row.fullName,
            email: json.email ?? row.email,
          },
          json.activationCode,
          json.activationExpiresAt,
        );
      }
      load(undefined, true);
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusyId(null);
    }
  }

  async function runIssuePasswordReset(row: {
    studentId: string;
    fullName: string;
    email: string | null;
  }) {
    const ok = window.confirm(t("admin.learners.resetCodeConfirm"));
    if (!ok) return;

    setBusyId(row.studentId);
    setError(null);
    setSuccessFlash(null);
    try {
      const res = await fetch(
        "/api/admin/students/issue-password-reset-code",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: row.studentId }),
        },
      );
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? t("admin.learners.issueFail"));
      } else if (json.resetCode && json.resetExpiresAt) {
        openCodeModal(
          {
            fullName: json.fullName ?? row.fullName,
            email: json.email ?? row.email,
          },
          json.resetCode,
          json.resetExpiresAt,
          {
            title: t("admin.learners.resetCodeTitle"),
            hint: t("admin.learners.resetCodeHint"),
          },
        );
      }
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusyId(null);
    }
  }

  async function runPasswordRecovery(row: {
    studentId: string;
    email: string | null;
  }) {
    const displayEmail = row.email?.trim() || t("chrome.learnerFallback");
    const ok = window.confirm(
      t("admin.learners.recoveryConfirm", { email: displayEmail }),
    );
    if (!ok) return;

    setBusyId(row.studentId);
    setError(null);
    setSuccessFlash(null);
    try {
      const res = await fetch("/api/admin/students/send-password-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: row.studentId }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? t("admin.learners.emailFail"));
      } else {
        setSuccessFlash(t("admin.learners.emailSent"));
      }
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusyId(null);
    }
  }

  async function runAccessToggle(
    studentId: string,
    kind: "disable" | "enable",
  ) {
    if (kind === "disable") {
      const ok = window.confirm(t("admin.learners.disableConfirm"));
      if (!ok) return;
    }
    setBusyId(studentId);
    setError(null);
    try {
      const path =
        kind === "disable"
          ? "/api/admin/students/disable"
          : "/api/admin/students/enable";
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? t("common.actionFailed"));
      }
      load(undefined, true);
    } catch {
      setError(t("common.networkError"));
    } finally {
      setBusyId(null);
    }
  }

  const totalPages = data?.totalPages ?? null;
  const totalItems = data?.totalItems ?? null;
  const currentPage = data?.page ?? page;
  const searching = pending || draftQuery.trim() !== query;

  return (
    <div className="space-y-5">
      {modal ? (
        <ActivationCodeModal
          data={modal}
          onClose={() => setModal(null)}
          title={modal.title}
          hint={modal.hint}
        />
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label={t("admin.learners.filterStatus")}
          className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100/90 p-1"
        >
          {statusTabs.map((tab) => {
            const active = status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={active}
                data-active={active}
                onClick={() => {
                  setPage(1);
                  setStatus(tab.value);
                }}
                className="ko-admin-pill-tab"
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-slate-500 lg:text-right">
          {searching ? `${t("admin.learners.searching")} · ` : null}
          {query
            ? t("admin.school.results", { count: totalItems ?? 0 })
            : totalItems != null
              ? t("admin.learners.perPageWithTotal", {
                  total: totalItems,
                  size: 10,
                })
              : t("admin.learners.perPage", { size: 10 })}
        </p>
      </div>

      <div
        ref={toolbarRef}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="relative shrink-0">
          <button
            type="button"
            className="ko-admin-toolbar-btn"
            aria-expanded={openMenu === "filter"}
            aria-haspopup="menu"
            onClick={() =>
              setOpenMenu((m) => (m === "filter" ? null : "filter"))
            }
          >
            <IconFilter className="ko-icon-sm" />
            {t("common.filter")}
          </button>
          {openMenu === "filter" ? (
            <div
              role="menu"
              className="ko-admin-menu absolute left-0 top-[calc(100%+0.4rem)] z-30 min-w-[12rem]"
            >
              {statusTabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={status === tab.value}
                  className="ko-admin-menu-item"
                  data-active={status === tab.value}
                  onClick={() => {
                    setPage(1);
                    setStatus(tab.value);
                    setOpenMenu(null);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch className="ko-icon" />
          </span>
          <input
            id={searchInputId}
            value={draftQuery}
            onChange={(e) => setDraftQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const next = draftQuery.trim();
                setPage(1);
                setQuery(next);
              }
            }}
            placeholder={t("admin.learners.searchPlaceholder")}
            aria-label={t("admin.learners.searchAria")}
            className="ko-admin-search"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            const next = draftQuery.trim();
            setPage(1);
            setQuery(next);
          }}
          className="ko-admin-primary-btn shrink-0"
        >
          <IconSearch className="ko-icon-sm" />
          {t("common.search")}
        </button>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className="ko-admin-toolbar-icon"
              data-active={openMenu === "sort" || sort !== "name-asc"}
              aria-label={t("admin.school.sort")}
              aria-expanded={openMenu === "sort"}
              aria-haspopup="menu"
              title={t("admin.learners.sortList")}
              onClick={() =>
                setOpenMenu((m) => (m === "sort" ? null : "sort"))
              }
            >
              <IconSort className="ko-icon" />
            </button>
            {openMenu === "sort" ? (
              <div
                role="menu"
                className="ko-admin-menu absolute right-0 top-[calc(100%+0.4rem)] z-30 min-w-[11.5rem]"
              >
                {sortOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sort === opt.value}
                    className="ko-admin-menu-item"
                    data-active={sort === opt.value}
                    onClick={() => {
                      setPage(1);
                      setSort(opt.value);
                      setOpenMenu(null);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="ko-admin-toolbar-icon"
            aria-label={t("admin.learners.refreshAria")}
            title={t("admin.learners.refreshTitle")}
            disabled={pending}
            onClick={() => {
              setOpenMenu(null);
              load(undefined, true);
            }}
          >
            <IconRefresh className="ko-icon" />
          </button>

          <div className="relative">
            <button
              type="button"
              className="ko-admin-toolbar-icon"
              data-active={openMenu === "more"}
              aria-label={t("common.more")}
              aria-expanded={openMenu === "more"}
              aria-haspopup="menu"
              onClick={() =>
                setOpenMenu((m) => (m === "more" ? null : "more"))
              }
            >
              <IconMore className="ko-icon" />
            </button>
            {openMenu === "more" ? (
              <div
                role="menu"
                className="ko-admin-menu absolute right-0 top-[calc(100%+0.4rem)] z-30 min-w-[13rem]"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="ko-admin-menu-item"
                  onClick={() => {
                    setDraftQuery("");
                    setQuery("");
                    setStatus("ALL");
                    setSort("name-asc");
                    setPage(1);
                    setOpenMenu(null);
                    setMenuNote(t("admin.learners.filtersReset"));
                  }}
                >
                  {t("admin.learners.resetFilters")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="ko-admin-menu-item"
                  onClick={() => {
                    setDraftQuery("");
                    setQuery("");
                    setPage(1);
                    setOpenMenu(null);
                    document.getElementById(searchInputId)?.focus();
                  }}
                >
                  {t("admin.school.resetSearch")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="ko-admin-menu-item"
                  onClick={() => {
                    setOpenMenu(null);
                    load(undefined, true);
                  }}
                >
                  {t("admin.learners.refreshTitle")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="ko-admin-menu-item"
                  onClick={async () => {
                    const n = totalItems ?? data?.rows.length ?? 0;
                    try {
                      await navigator.clipboard.writeText(String(n));
                      setMenuNote(t("common.copied"));
                    } catch {
                      setMenuNote(t("admin.learners.copyFail"));
                    }
                    setOpenMenu(null);
                  }}
                >
                  {t("common.copy")} ({totalItems ?? "—"})
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {menuNote ? (
        <p className="text-xs font-medium text-[var(--admin-blue)]">{menuNote}</p>
      ) : null}

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {successFlash ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          role="status"
        >
          {successFlash}
        </p>
      ) : null}

      <div className="ko-admin-table-scroll -mx-1 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:mx-0">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[44rem] table-fixed border-collapse text-left text-sm md:min-w-[62rem]">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[20%]" />
              <col className="w-[14%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {t("admin.learners.colLearner")}
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {t("common.email")}
                </th>
                <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 md:table-cell">
                  {t("admin.file.formation")}
                </th>
                <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 lg:table-cell">
                  {t("admin.learners.colEnrolled")}
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {t("admin.learners.colAccess")}
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {t("admin.learners.colAction")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pending && !data ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-slate-500"
                  >
                    {t("admin.learners.loadingList")}
                  </td>
                </tr>
              ) : null}
              {data?.rows.map((row) => {
                const href = adminStudentDetailHref(
                  row.accountStatus,
                  row.studentId,
                );
                return (
                  <tr
                    key={row.learnworldsUserId}
                    className="group transition-colors hover:bg-blue-50/40"
                  >
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex min-w-0 items-center gap-3">
                        <AdminAvatar name={row.fullName} size="sm" />
                        <p className="truncate font-semibold text-slate-900">
                          {row.fullName}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <p className="truncate text-slate-600" title={row.email ?? undefined}>
                        {row.email ?? "—"}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3.5 align-middle md:table-cell">
                      {row.tags.length ? (
                        <div className="flex flex-wrap gap-1">
                          {row.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                              title={tag}
                            >
                              {tag}
                            </span>
                          ))}
                          {row.tags.length > 2 ? (
                            <span className="text-[11px] font-medium text-slate-400">
                              +{row.tags.length - 2}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3.5 align-middle text-slate-600 lg:table-cell">
                      {formatDate(row.createdAt, locale)}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <AccountStatusBadge
                        status={row.accountStatus}
                        label={t(accountStatusKey(row.accountStatus))}
                      />
                      {row.invitationError ? (
                        <p className="mt-1 max-w-[11rem] truncate text-[11px] text-red-600" title={row.invitationError}>
                          {row.invitationError}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3.5 align-middle sm:px-4">
                      <div className="flex justify-end">
                        <AdminRowActions>
                          {href ? (
                            <AdminRowAction
                              href={href}
                              label={t("status.view")}
                              tone="primary"
                              icon={<IconEye className="ko-icon-sm" />}
                            />
                          ) : null}
                          {canManageStudents &&
                          row.accountStatus === "ACTIVE" &&
                          row.studentId ? (
                            <>
                              <AdminRowAction
                                label={t("status.resetAccess")}
                                disabled={busyId === row.studentId}
                                onClick={() =>
                                  runIssuePasswordReset({
                                    studentId: row.studentId!,
                                    fullName: row.fullName,
                                    email: row.email,
                                  })
                                }
                                icon={<IconRefresh className="ko-icon-sm" />}
                              />
                              <AdminRowAction
                                label={t("admin.learners.emailLink")}
                                disabled={busyId === row.studentId}
                                onClick={() =>
                                  runPasswordRecovery({
                                    studentId: row.studentId!,
                                    email: row.email,
                                  })
                                }
                                icon={<IconMail className="ko-icon-sm" />}
                              />
                              <AdminRowAction
                                label={t("common.disable")}
                                tone="danger"
                                disabled={busyId === row.studentId}
                                onClick={() =>
                                  runAccessToggle(row.studentId!, "disable")
                                }
                                icon={<IconBan className="ko-icon-sm" />}
                              />
                            </>
                          ) : null}
                          {canManageStudents &&
                          row.accountStatus === "DISABLED" &&
                          row.studentId ? (
                            <AdminRowAction
                              labeled
                              label={t("common.reactivate")}
                              tone="success"
                              disabled={busyId === row.studentId}
                              onClick={() =>
                                runAccessToggle(row.studentId!, "enable")
                              }
                              icon={<IconCheck className="ko-icon-sm" />}
                            />
                          ) : null}
                          {canManageStudents &&
                          row.accountStatus === "PENDING_ACTIVATION" &&
                          row.studentId ? (
                            <>
                              <AdminRowAction
                                label={t("admin.learners.regenerate")}
                                disabled={busyId === row.studentId}
                                onClick={() =>
                                  runRegenerate({
                                    studentId: row.studentId!,
                                    fullName: row.fullName,
                                    email: row.email,
                                  })
                                }
                                icon={<IconRefresh className="ko-icon-sm" />}
                              />
                              <AdminRowAction
                                label={t("common.disable")}
                                tone="danger"
                                disabled={busyId === row.studentId}
                                onClick={() =>
                                  runAccessToggle(row.studentId!, "disable")
                                }
                                icon={<IconBan className="ko-icon-sm" />}
                              />
                            </>
                          ) : null}
                          {canManageStudents &&
                          (row.accountStatus === "NOT_ACTIVATED" ||
                            row.accountStatus === "ERROR") ? (
                            <AdminRowAction
                              labeled
                              tone="success"
                              label={
                                row.accountStatus === "ERROR"
                                  ? t("admin.learners.retry")
                                  : t("status.active")
                              }
                              disabled={busyId === row.learnworldsUserId}
                              onClick={() =>
                                runActivate({
                                  learnworldsUserId: row.learnworldsUserId,
                                  fullName: row.fullName,
                                  email: row.email,
                                })
                              }
                              icon={<IconCheck className="ko-icon-sm" />}
                            />
                          ) : null}
                        </AdminRowActions>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data && data.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-16 text-center text-slate-500"
                  >
                    {t("admin.learners.empty")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        page={currentPage}
        totalPages={totalPages}
        pending={pending}
        onChange={setPage}
        pageSize={10}
        rowCount={data?.rows.length ?? 0}
      />
    </div>
  );
}
