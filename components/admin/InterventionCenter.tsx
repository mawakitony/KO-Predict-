"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  IconActivity,
  IconAlert,
  IconBell,
  IconBook,
  IconCalendar,
  IconCheck,
  IconClock,
  IconEye,
  IconInbox,
  IconPhone,
  IconTarget,
} from "@/components/admin/AdminIcons";
import { AdminAvatar } from "@/components/admin/AdminUi";
import type { CoachInterventionCard } from "@/lib/admin/interventions/types";
import {
  interventionReasonLabelFr,
  interventionStatusLabelFr,
  type InterventionStatus,
} from "@/lib/admin/interventions/types";
import {
  formatDateFr,
  formatScore,
  riskLabel,
  riskToneClasses,
} from "@/lib/dashboard/format";
import { cockpitDaysUntil } from "@/lib/dashboard/cockpit-copy";

type StatusFilter = InterventionStatus | "ACTIVE";

function daysLabel(targetExamDate: string | null): string | null {
  if (!targetExamDate) return null;
  const days = cockpitDaysUntil(targetExamDate);
  if (days == null) return null;
  if (days < 0) return "Date d’examen dépassée";
  if (days === 0) return "Examen aujourd’hui";
  return `Examen dans ${days} jour${days > 1 ? "s" : ""}`;
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-1.5 text-slate-400">
        <span className="text-[var(--admin-blue)]">{icon}</span>
        <p className="text-[10px] font-bold uppercase tracking-[0.08em]">
          {label}
        </p>
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export function InterventionCenter({
  cards,
  canManage,
  dataSource,
}: {
  cards: CoachInterventionCard[];
  canManage: boolean;
  dataSource: "demo" | "database";
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<StatusFilter>("ACTIVE");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    return cards.filter((card) => {
      if (filter === "ACTIVE") {
        return card.intervention.status !== "RESOLVED";
      }
      return card.intervention.status === filter;
    });
  }, [cards, filter]);

  const counts = useMemo(() => {
    const c = {
      critical: 0,
      red: 0,
      amber: 0,
      active: 0,
    };
    for (const card of cards) {
      if (card.intervention.status === "RESOLVED") continue;
      c.active += 1;
      const risk = card.row.prediction.riskLevel;
      if (risk === "CRITICAL") c.critical += 1;
      else if (risk === "RED") c.red += 1;
      else if (risk === "AMBER") c.amber += 1;
    }
    return c;
  }, [cards]);

  function setStatus(interventionId: string, status: InterventionStatus) {
    if (!canManage) return;
    if (dataSource === "demo") {
      setError("Mode démo : les statuts ne sont pas persistés.");
      return;
    }
    setError(null);
    setPendingId(interventionId);
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/interventions/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interventionId, status }),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !json.ok) {
          setError(json.error ?? "Mise à jour impossible.");
          return;
        }
        router.refresh();
      } catch {
        setError("Erreur réseau.");
      } finally {
        setPendingId(null);
      }
    });
  }

  const filters: Array<{
    id: StatusFilter;
    label: string;
    icon: ReactNode;
  }> = [
    { id: "ACTIVE", label: "Actives", icon: <IconInbox className="ko-icon-sm" /> },
    { id: "OPEN", label: "Ouvert", icon: <IconAlert className="ko-icon-sm" /> },
    {
      id: "CONTACTED",
      label: "Contacté",
      icon: <IconPhone className="ko-icon-sm" />,
    },
    {
      id: "FOLLOW_UP",
      label: "À rappeler",
      icon: <IconBell className="ko-icon-sm" />,
    },
    {
      id: "RESOLVED",
      label: "Terminé",
      icon: <IconCheck className="ko-icon-sm" />,
    },
  ];

  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_12px_40px_-24px_rgba(15,23,42,0.28)]"
      aria-labelledby="coach-center-title"
    >
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--admin-blue)] text-white shadow-[0_10px_20px_-12px_rgba(37,99,235,0.9)]">
              <IconInbox className="ko-icon" />
            </span>
            <div>
              <h2
                id="coach-center-title"
                className="ko-display text-xl font-semibold text-slate-900"
              >
                Interventions prioritaires
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                File de travail coach — qui contacter aujourd’hui.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
              <IconAlert className="ko-icon-sm" />
              {counts.critical} critiques
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800 ring-1 ring-orange-200">
              <IconTarget className="ko-icon-sm" />
              {counts.red} risques élevés
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
              <IconBell className="ko-icon-sm" />
              {counts.amber} à surveiller
            </span>
          </div>
        </div>

        <div
          className="mt-4 flex flex-wrap gap-1.5 rounded-2xl bg-white/80 p-1.5 ring-1 ring-slate-200/80"
          role="tablist"
          aria-label="Filtrer les interventions"
        >
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-[var(--admin-blue)] text-white shadow-[0_8px_16px_-10px_rgba(37,99,235,0.9)]"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span className={active ? "text-white" : "text-slate-400"}>
                  {f.icon}
                </span>
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6 sm:py-5">
        {error ? (
          <p className="mb-4 text-sm text-rose-600" role="alert">
            {error}
          </p>
        ) : null}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
            <IconInbox className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600">
              Aucune intervention dans ce filtre.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Changez de statut ou revenez plus tard.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {filtered.map((card) => {
              const { row, intervention } = card;
              const currentRisk = row.prediction.riskLevel;
              const tone = riskToneClasses(currentRisk);
              const exam = daysLabel(row.student.targetExamDate);
              const busy = isPending && pendingId === intervention.id;
              return (
                <li
                  key={intervention.id}
                  className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-blue-200/80 hover:shadow-[0_12px_28px_-20px_rgba(37,99,235,0.35)] sm:p-5"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-stretch xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <AdminAvatar name={row.student.fullName} size="md" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold text-slate-900">
                              {row.student.fullName}
                            </p>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}
                            >
                              <IconAlert className="h-3 w-3" />
                              {currentRisk
                                ? `${currentRisk} — ${riskLabel(currentRisk)}`
                                : `Risque : ${riskLabel(null)}`}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                              <IconClock className="h-3 w-3" />
                              {interventionStatusLabelFr(intervention.status)}
                            </span>
                          </div>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1.5">
                              <IconBook className="ko-icon-sm text-slate-400" />
                              {row.student.certification}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1.5">
                              <IconCalendar className="ko-icon-sm text-slate-400" />
                              {exam ?? "Date d’examen non renseignée"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <MetricTile
                          icon={<IconTarget className="ko-icon-sm" />}
                          label="Readiness"
                          value={`${formatScore(row.prediction.readinessScore)} / 100`}
                        />
                        <MetricTile
                          icon={<IconActivity className="ko-icon-sm" />}
                          label="Rythme"
                          value={
                            row.prediction.requiredPace != null
                              ? `${row.prediction.currentPace ?? "—"} / ${row.prediction.requiredPace}`
                              : String(row.prediction.currentPace ?? "—")
                          }
                        />
                        <MetricTile
                          icon={<IconClock className="ko-icon-sm" />}
                          label="Inactivité"
                          value={
                            row.metrics.inactiveDays != null
                              ? `${row.metrics.inactiveDays} j`
                              : "—"
                          }
                        />
                        <MetricTile
                          icon={<IconCalendar className="ko-icon-sm" />}
                          label="Ouvert le"
                          value={formatDateFr(
                            intervention.createdAt.slice(0, 10),
                          )}
                        />
                      </div>

                      {intervention.reasons.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-1.5">
                          {intervention.reasons.map((code) => (
                            <li
                              key={code}
                              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200"
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--admin-blue)]" />
                              {interventionReasonLabelFr(code)}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 pt-3 xl:w-[12.5rem] xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0">
                      <Link
                        href={`/admin/students/${row.student.studentId}`}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-blue)] px-3 py-2.5 text-xs font-semibold text-white shadow-[0_8px_18px_-12px_rgba(37,99,235,0.9)] hover:bg-[var(--admin-blue-hover)]"
                      >
                        <IconEye className="ko-icon-sm" />
                        Voir le dossier
                      </Link>
                      {canManage && intervention.status !== "RESOLVED" ? (
                        <>
                          {intervention.status !== "CONTACTED" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                setStatus(intervention.id, "CONTACTED")
                              }
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              <IconPhone className="ko-icon-sm" />
                              Marquer contacté
                            </button>
                          ) : null}
                          {intervention.status !== "FOLLOW_UP" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                setStatus(intervention.id, "FOLLOW_UP")
                              }
                              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                              <IconBell className="ko-icon-sm" />
                              À rappeler
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              setStatus(intervention.id, "RESOLVED")
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                          >
                            <IconCheck className="ko-icon-sm" />
                            Terminer
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
