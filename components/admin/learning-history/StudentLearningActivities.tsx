"use client";

import { useMemo, useState } from "react";
import {
  activityStatusLabelFr,
  activityTypeLabelFr,
  formatDurationSeconds,
  formatScorePercent,
  matchesActivityFilter,
} from "@/lib/admin/learning-history/parse";
import type {
  LearningActivityFilter,
  LearningHistoryActivity,
} from "@/types/learning-history";

const FILTERS: Array<{ id: LearningActivityFilter; label: string }> = [
  { id: "all", label: "Toutes" },
  { id: "completed", label: "Terminées" },
  { id: "not_completed", label: "Non terminées" },
  { id: "quiz", label: "Quiz / examens" },
  { id: "videos", label: "Vidéos" },
  { id: "documents", label: "Documents" },
  { id: "other", label: "Autres" },
];

export function StudentLearningActivities({
  loading,
  error,
  activities,
  completedCount,
  totalCount,
  onRefresh,
}: {
  loading: boolean;
  error: string | null;
  activities: LearningHistoryActivity[];
  completedCount: number;
  totalCount: number;
  onRefresh: () => void;
}) {
  const [filter, setFilter] = useState<LearningActivityFilter>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return activities.filter((a) => {
      if (!matchesActivityFilter(a, filter)) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.section?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [activities, filter, query]);

  return (
    <section className="rounded-[1.5rem] bg-white p-4 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ko-display text-lg font-semibold text-slate-900">
            Activités
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {totalCount > 0
              ? `${completedCount} terminées sur ${totalCount}`
              : "Progression LearnWorlds"}
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          Actualiser
        </button>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-slate-500">Chargement de l’historique…</p>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    filter === f.id
                      ? "bg-[var(--admin-blue)] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une activité…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-[var(--admin-blue)] focus:bg-white focus:ring-2"
            />
          </div>

          {/* Desktop table */}
          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-2 py-2 font-semibold">Activité</th>
                  <th className="px-2 py-2 font-semibold">Section</th>
                  <th className="px-2 py-2 font-semibold">Type</th>
                  <th className="px-2 py-2 font-semibold">Statut</th>
                  <th className="px-2 py-2 font-semibold">Score</th>
                  <th className="px-2 py-2 font-semibold">Temps</th>
                  <th className="px-2 py-2 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={`${a.courseId ?? "c"}-${a.id}`}
                    className="border-b border-slate-50"
                  >
                    <td className="max-w-[16rem] px-2 py-2.5 font-medium text-slate-900">
                      {a.name}
                    </td>
                    <td className="px-2 py-2.5 text-slate-600">
                      {a.section ?? "—"}
                    </td>
                    <td className="px-2 py-2.5 text-slate-600">
                      {activityTypeLabelFr(a.type)}
                    </td>
                    <td className="px-2 py-2.5 text-slate-600">
                      {activityStatusLabelFr(a.status)}
                    </td>
                    <td className="px-2 py-2.5 text-slate-700">
                      {a.type === "assessmentV2"
                        ? formatScorePercent(a.score)
                        : "—"}
                    </td>
                    <td className="px-2 py-2.5 text-slate-600">
                      {formatDurationSeconds(a.timeOnUnitSeconds)}
                    </td>
                    <td className="px-2 py-2.5 text-slate-400">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 ? (
              <p className="py-6 text-sm text-slate-500">
                Aucune activité pour ce filtre.
              </p>
            ) : null}
          </div>

          {/* Mobile cards */}
          <ul className="mt-4 space-y-3 md:hidden">
            {filtered.map((a) => (
              <li
                key={`m-${a.courseId ?? "c"}-${a.id}`}
                className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3"
              >
                <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {a.section ?? "Sans section"} · {activityTypeLabelFr(a.type)}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div>
                    <dt className="text-slate-400">Statut</dt>
                    <dd>{activityStatusLabelFr(a.status)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Score</dt>
                    <dd>
                      {a.type === "assessmentV2"
                        ? formatScorePercent(a.score)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Temps</dt>
                    <dd>{formatDurationSeconds(a.timeOnUnitSeconds)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Date</dt>
                    <dd>—</dd>
                  </div>
                </dl>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="text-sm text-slate-500">
                Aucune activité pour ce filtre.
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
    </section>
  );
}
