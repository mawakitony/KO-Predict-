"use client";

import { useMemo, useState } from "react";
import {
  Icon3dActivities,
  Icon3dRefresh,
  learningTypeIcon,
} from "@/components/learning/Learning3dIcons";
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

function statusTone(status: LearningHistoryActivity["status"]) {
  if (status === "completed" || status === "passed") return "is-done";
  if (status === "failed") return "is-fail";
  return "is-todo";
}

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

  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <section className="ko-learn-panel">
      <div className="ko-learn-panel-head">
        <div className="ko-learn-panel-title-row">
          <span className="ko-learn-card-icon" aria-hidden>
            <Icon3dActivities className="ko-learn-3d is-sm" />
          </span>
          <div>
            <h2 className="ko-learn-panel-title">Activités</h2>
            <p className="ko-learn-panel-sub">
              {totalCount > 0
                ? `${completedCount} terminées sur ${totalCount} · ${progressPct}%`
                : "Progression LearnWorlds de l’apprenant"}
            </p>
          </div>
        </div>
        <button type="button" onClick={onRefresh} className="ko-learn-refresh">
          <Icon3dRefresh className="ko-learn-3d is-xs" />
          Actualiser
        </button>
      </div>

      {loading ? (
        <p className="ko-learn-loading">Chargement de l’historique…</p>
      ) : null}

      {error ? (
        <div className="ko-learn-error">
          <p>{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="ko-learn-filters" role="group" aria-label="Filtres">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`ko-learn-filter${filter === f.id ? " is-active" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="ko-learn-search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une activité…"
              aria-label="Rechercher une activité"
            />
          </label>

          <ul className="ko-learn-list">
            {filtered.map((a) => {
              const Icon = learningTypeIcon(a.type);
              return (
                <li
                  key={`${a.courseId ?? "c"}-${a.id}`}
                  className="ko-learn-card"
                >
                  <div className="ko-learn-card-icon">
                    <Icon />
                  </div>
                  <div className="ko-learn-card-body">
                    <p className="ko-learn-card-title">{a.name}</p>
                    <p className="ko-learn-card-meta">
                      {a.section ?? "Sans section"} ·{" "}
                      {activityTypeLabelFr(a.type)}
                    </p>
                    <div className="ko-learn-card-foot">
                      <span
                        className={`ko-learn-status ${statusTone(a.status)}`}
                      >
                        {activityStatusLabelFr(a.status)}
                      </span>
                      <span>
                        Score :{" "}
                        {a.type === "assessmentV2"
                          ? formatScorePercent(a.score)
                          : "—"}
                      </span>
                      <span>
                        Temps : {formatDurationSeconds(a.timeOnUnitSeconds)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="ko-learn-empty">
                Aucune activité pour ce filtre.
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
    </section>
  );
}
