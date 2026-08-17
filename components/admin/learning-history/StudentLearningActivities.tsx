"use client";

import { useMemo, useState } from "react";
import {
  Icon3dActivities,
  Icon3dRefresh,
  learningTypeIcon,
} from "@/components/learning/Learning3dIcons";
import {
  formatDurationSeconds,
  formatScorePercent,
  matchesActivityFilter,
} from "@/lib/admin/learning-history/parse";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { activityStatusKey, activityTypeKey } from "@/lib/i18n/labels";
import type { MessageKey } from "@/lib/i18n/translate";
import type {
  LearningActivityFilter,
  LearningHistoryActivity,
} from "@/types/learning-history";

const FILTER_KEYS: Array<{ id: LearningActivityFilter; key: MessageKey }> = [
  { id: "all", key: "admin.history.filterAll" },
  { id: "completed", key: "admin.history.filterDone" },
  { id: "not_completed", key: "admin.history.filterTodo" },
  { id: "quiz", key: "admin.history.filterQuiz" },
  { id: "videos", key: "admin.history.filterVideos" },
  { id: "documents", key: "admin.history.filterDocs" },
  { id: "other", key: "admin.history.filterOther" },
];

function statusTone(status: LearningHistoryActivity["status"]) {
  switch (status) {
    case "completed":
      return "is-done";
    case "not_completed":
      return "is-todo";
    default:
      return "is-unknown";
  }
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
  const { t } = useLanguage();
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
            <h2 className="ko-learn-panel-title">{t("admin.file.activities")}</h2>
            <p className="ko-learn-panel-sub">
              {totalCount > 0
                ? t("admin.file.completedOf", {
                    completed: completedCount,
                    total: totalCount,
                    pct: progressPct,
                  })
                : t("admin.file.lwProgress")}
            </p>
          </div>
        </div>
        <button type="button" onClick={onRefresh} className="ko-learn-refresh">
          <Icon3dRefresh className="ko-learn-3d is-xs" />
          {t("common.refresh")}
        </button>
      </div>

      {loading ? (
        <p className="ko-learn-loading">{t("admin.file.loadingHistory")}</p>
      ) : null}

      {error ? (
        <div className="ko-learn-error">
          <p>{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="ko-learn-filters" role="group" aria-label={t("common.filter")}>
            {FILTER_KEYS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`ko-learn-filter${filter === f.id ? " is-active" : ""}`}
              >
                {t(f.key)}
              </button>
            ))}
          </div>
          <label className="ko-learn-search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("admin.history.searchActivity")}
              aria-label={t("chrome.searchActivity")}
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
                      {a.section ?? t("admin.file.noSection")} ·{" "}
                      {t(activityTypeKey(a.type))}
                    </p>
                    <div className="ko-learn-card-foot">
                      <span
                        className={`ko-learn-status ${statusTone(a.status)}`}
                      >
                        {t(activityStatusKey(a.status))}
                      </span>
                      <span>
                        {t("common.score")} :{" "}
                        {a.type === "assessmentV2"
                          ? formatScorePercent(a.score)
                          : "—"}
                      </span>
                      <span>
                        {t("common.time")} : {formatDurationSeconds(a.timeOnUnitSeconds)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="ko-learn-empty">
                {t("admin.learners.empty")}
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
    </section>
  );
}
