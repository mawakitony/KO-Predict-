"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import type {
  KoPredictAccountStatus,
  LearnWorldsRosterPage,
} from "@/lib/admin/types";
import { adminStudentDetailHref } from "@/lib/admin/types";
import { formatDateFr } from "@/lib/dashboard/format";
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
  IconMore,
  IconRefresh,
  IconSearch,
  IconSort,
} from "@/components/admin/AdminIcons";
import { AdminPagination } from "@/components/admin/AdminPagination";

type RosterSort = "name-asc" | "name-desc" | "date-asc" | "date-desc";
type MenuId = "filter" | "sort" | "more" | null;

const SORT_OPTIONS: Array<{ value: RosterSort; label: string }> = [
  { value: "name-asc", label: "Nom A → Z" },
  { value: "name-desc", label: "Nom Z → A" },
  { value: "date-desc", label: "Plus récents" },
  { value: "date-asc", label: "Plus anciens" },
];

const STATUS_LABEL: Record<KoPredictAccountStatus, string> = {
  NOT_ACTIVATED: "Non activé",
  PENDING_ACTIVATION: "En attente",
  ACTIVE: "Actif",
  DISABLED: "Désactivé",
  ERROR: "Erreur",
};

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "Tous" },
  { value: "ACTIVE", label: "Actifs" },
  { value: "PENDING_ACTIVATION", label: "En attente" },
  { value: "NOT_ACTIVATED", label: "Non activés" },
  { value: "DISABLED", label: "Désactivés" },
  { value: "ERROR", label: "Erreurs" },
];

export function LearnWorldsRoster({
  canManageStudents = false,
}: {
  canManageStudents?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [draftQuery, setDraftQuery] = useState("");
  const [sort, setSort] = useState<RosterSort>("name-asc");
  const [data, setData] = useState<LearnWorldsRosterPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [modal, setModal] = useState<ActivationCodeModalData | null>(null);
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [menuNote, setMenuNote] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const searchInputId = useId();

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
            setError(json.error ?? "Impossible de charger LearnWorlds.");
            return;
          }
          setData(json);
        } catch (err) {
          if (signal?.aborted) return;
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError("Erreur réseau.");
        }
      });
    },
    [page, status, query, sort],
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
  ) {
    setModal({
      fullName: row.fullName,
      email: row.email ?? "—",
      activationCode,
      expiresAt,
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
        setError(json.error ?? "Action échouée.");
      } else if (json.activationCode && json.activationExpiresAt) {
        openCodeModal(row, json.activationCode, json.activationExpiresAt);
      }
      load(undefined, true);
    } catch {
      setError("Erreur réseau.");
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
        setError(json.error ?? "Régénération échouée.");
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
      setError("Erreur réseau.");
    } finally {
      setBusyId(null);
    }
  }

  async function runAccessToggle(
    studentId: string,
    kind: "disable" | "enable",
  ) {
    if (kind === "disable") {
      const ok = window.confirm(
        "Voulez-vous vraiment désactiver l'accès KO Predict™ de cet apprenant ?\nSes données seront conservées.",
      );
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
        setError(json.error ?? "Action échouée.");
      }
      load(undefined, true);
    } catch {
      setError("Erreur réseau.");
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
        <ActivationCodeModal data={modal} onClose={() => setModal(null)} />
      ) : null}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filtrer par statut"
          className="flex flex-wrap items-center gap-1 rounded-full bg-slate-100/90 p-1"
        >
          {STATUS_TABS.map((tab) => {
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
          {searching ? "Recherche… · " : null}
          {query
            ? `${totalItems ?? 0} résultat${(totalItems ?? 0) > 1 ? "s" : ""}`
            : totalItems != null
              ? `${totalItems} apprenants · 10 / page`
              : "10 / page"}
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
            Filtrer
          </button>
          {openMenu === "filter" ? (
            <div
              role="menu"
              className="ko-admin-menu absolute left-0 top-[calc(100%+0.4rem)] z-30 min-w-[12rem]"
            >
              {STATUS_TABS.map((tab) => (
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
            placeholder="Rechercher un apprenant…"
            aria-label="Rechercher un apprenant"
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
          Rechercher
        </button>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              className="ko-admin-toolbar-icon"
              data-active={openMenu === "sort" || sort !== "name-asc"}
              aria-label="Trier"
              aria-expanded={openMenu === "sort"}
              aria-haspopup="menu"
              title="Trier la liste"
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
                {SORT_OPTIONS.map((opt) => (
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
            aria-label="Actualiser"
            title="Actualiser (ignore le cache)"
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
              aria-label="Plus d’options"
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
                    setMenuNote("Filtres réinitialisés");
                  }}
                >
                  Réinitialiser filtres
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
                  Effacer la recherche
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
                  Forcer l’actualisation
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="ko-admin-menu-item"
                  onClick={async () => {
                    const n = totalItems ?? data?.rows.length ?? 0;
                    try {
                      await navigator.clipboard.writeText(String(n));
                      setMenuNote(`${n} copié dans le presse-papiers`);
                    } catch {
                      setMenuNote("Copie impossible");
                    }
                    setOpenMenu(null);
                  }}
                >
                  Copier le total ({totalItems ?? "—"})
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

      <div className="ko-admin-table-scroll -mx-1 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:mx-0">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[40rem] table-fixed border-collapse text-left text-sm md:min-w-[56rem]">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[22%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Apprenant
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Email
                </th>
                <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 md:table-cell">
                  Formation
                </th>
                <th className="hidden px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 lg:table-cell">
                  Inscription
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                  Action
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
                    Chargement de la liste…
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
                      {formatDateFr(row.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <AccountStatusBadge
                        status={row.accountStatus}
                        label={STATUS_LABEL[row.accountStatus]}
                      />
                      {row.invitationError ? (
                        <p className="mt-1 max-w-[11rem] truncate text-[11px] text-red-600" title={row.invitationError}>
                          {row.invitationError}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {href ? (
                          <Link href={href} className="ko-btn-blue-soft !px-2.5 !py-1.5 text-xs">
                            <IconEye className="ko-icon-sm" />
                            Voir
                          </Link>
                        ) : null}
                        {canManageStudents &&
                        row.accountStatus === "ACTIVE" &&
                        row.studentId ? (
                          <button
                            type="button"
                            disabled={busyId === row.studentId}
                            onClick={() =>
                              runAccessToggle(row.studentId!, "disable")
                            }
                            className="ko-btn-ghost !px-2.5 !py-1.5 text-xs"
                          >
                            <IconBan className="ko-icon-sm" />
                            Désactiver
                          </button>
                        ) : null}
                        {canManageStudents &&
                        row.accountStatus === "DISABLED" &&
                        row.studentId ? (
                          <button
                            type="button"
                            disabled={busyId === row.studentId}
                            onClick={() =>
                              runAccessToggle(row.studentId!, "enable")
                            }
                            className="ko-btn-blue !px-2.5 !py-1.5 text-xs"
                          >
                            <IconCheck className="ko-icon-sm" />
                            Réactiver
                          </button>
                        ) : null}
                        {canManageStudents &&
                        row.accountStatus === "PENDING_ACTIVATION" &&
                        row.studentId ? (
                          <>
                            <button
                              type="button"
                              disabled={busyId === row.studentId}
                              onClick={() =>
                                runRegenerate({
                                  studentId: row.studentId!,
                                  fullName: row.fullName,
                                  email: row.email,
                                })
                              }
                              className="ko-btn-ghost !px-2.5 !py-1.5 text-xs"
                            >
                              <IconRefresh className="ko-icon-sm" />
                              Régénérer
                            </button>
                            <button
                              type="button"
                              disabled={busyId === row.studentId}
                              onClick={() =>
                                runAccessToggle(row.studentId!, "disable")
                              }
                              className="ko-btn-ghost !px-2.5 !py-1.5 text-xs"
                            >
                              <IconBan className="ko-icon-sm" />
                              Désactiver
                            </button>
                          </>
                        ) : null}
                        {canManageStudents &&
                        (row.accountStatus === "NOT_ACTIVATED" ||
                          row.accountStatus === "ERROR") ? (
                          <button
                            type="button"
                            disabled={busyId === row.learnworldsUserId}
                            onClick={() =>
                              runActivate({
                                learnworldsUserId: row.learnworldsUserId,
                                fullName: row.fullName,
                                email: row.email,
                              })
                            }
                            className="ko-btn-blue !px-3 !py-1.5 text-xs"
                          >
                            <IconCheck className="ko-icon-sm" />
                            {row.accountStatus === "ERROR"
                              ? "Réessayer"
                              : "Activer"}
                          </button>
                        ) : null}
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
                    Aucun apprenant pour ce filtre.
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
