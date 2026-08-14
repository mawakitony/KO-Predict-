"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
      // Compteurs = prédiction actuelle, pas un risque figé d'intervention.
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

  const filters: Array<{ id: StatusFilter; label: string }> = [
    { id: "ACTIVE", label: "Actives" },
    { id: "OPEN", label: "Ouvert" },
    { id: "CONTACTED", label: "Contacté" },
    { id: "FOLLOW_UP", label: "À rappeler" },
    { id: "RESOLVED", label: "Terminé" },
  ];

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.22)] sm:p-6"
      aria-labelledby="coach-center-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="coach-center-title"
            className="ko-display text-xl font-semibold text-slate-900"
          >
            Interventions prioritaires
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Qui contacter aujourd’hui — file de travail coach.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700 ring-1 ring-rose-200">
            {counts.critical} critiques
          </span>
          <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-800 ring-1 ring-orange-200">
            {counts.red} risques élevés
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-900 ring-1 ring-amber-200">
            {counts.amber} à surveiller
          </span>
        </div>
      </div>

      <div
        className="mt-4 flex flex-wrap gap-1.5"
        role="tablist"
        aria-label="Filtrer les interventions"
      >
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === f.id
                ? "bg-[var(--admin-blue)] text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-rose-600" role="alert">
          {error}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          Aucune intervention dans ce filtre.
        </p>
      ) : (
        <ul className="mt-5 grid gap-3">
          {filtered.map((card) => {
            const { row, intervention } = card;
            const currentRisk = row.prediction.riskLevel;
            const tone = riskToneClasses(currentRisk);
            const exam = daysLabel(row.student.targetExamDate);
            const busy = isPending && pendingId === intervention.id;
            return (
              <li
                key={intervention.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <AdminAvatar name={row.student.fullName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {row.student.fullName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {row.student.certification}
                        {exam
                          ? ` · ${exam}`
                          : " · Date d’examen non renseignée"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.badge}`}
                        >
                          {currentRisk
                            ? `${currentRisk} — ${riskLabel(currentRisk)}`
                            : `Risque : ${riskLabel(null)}`}
                        </span>
                        <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                          {interventionStatusLabelFr(intervention.status)}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Readiness
                          </p>
                          <p className="font-semibold text-slate-800">
                            {formatScore(row.prediction.readinessScore)} / 100
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Rythme
                          </p>
                          <p className="font-semibold text-slate-800">
                            {row.prediction.currentPace ?? "—"}
                            {row.prediction.requiredPace != null
                              ? ` / ${row.prediction.requiredPace}`
                              : null}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Inactivité
                          </p>
                          <p className="font-semibold text-slate-800">
                            {row.metrics.inactiveDays != null
                              ? `${row.metrics.inactiveDays} j`
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Ouvert le
                          </p>
                          <p className="font-semibold text-slate-800">
                            {formatDateFr(intervention.createdAt.slice(0, 10))}
                          </p>
                        </div>
                      </div>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {intervention.reasons.map((code) => (
                          <li
                            key={code}
                            className="rounded-md bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200"
                          >
                            {interventionReasonLabelFr(code)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:max-w-[16rem] lg:justify-end">
                    <Link
                      href={`/admin/students/${row.student.studentId}`}
                      className="inline-flex rounded-lg bg-[var(--admin-blue)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--admin-blue-hover)]"
                    >
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
                            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
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
                            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            À rappeler
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            setStatus(intervention.id, "RESOLVED")
                          }
                          className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                        >
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
    </section>
  );
}
