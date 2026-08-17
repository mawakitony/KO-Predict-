"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  bestAssessmentScore,
  formatDurationSeconds,
  formatScorePercent,
  matchesActivityFilter,
  scoredAssessments,
  summarizeAttempts,
} from "@/lib/admin/learning-history/parse";
import { formatDateTime } from "@/lib/i18n/format-date";
import { activityStatusKey, activityTypeKey } from "@/lib/i18n/labels";
import type { MessageKey } from "@/lib/i18n/translate";
import { formatPercentOrDash } from "@/lib/learning/format";
import {
  interpretActivitiesResponse,
  shouldAutoFetchOnMount,
} from "@/lib/learning/lw-id";
import {
  Icon3dQuiz,
  Icon3dRefresh,
  learningTypeIcon,
} from "@/components/learning/Learning3dIcons";
import type {
  LearningActivityFilter,
  LearningAssessmentAttempt,
  LearningAssessmentSummary,
  LearningHistoryActivity,
} from "@/types/learning-history";

type Tab = "activities" | "quizzes";

const FILTER_KEYS: Array<{ id: LearningActivityFilter; key: MessageKey }> = [
  { id: "all", key: "admin.history.filterAll" },
  { id: "completed", key: "admin.history.filterDone" },
  { id: "not_completed", key: "admin.history.filterTodo" },
  { id: "quiz", key: "admin.history.filterQuiz" },
  { id: "videos", key: "admin.history.filterVideos" },
  { id: "documents", key: "admin.history.filterDocs" },
  { id: "other", key: "admin.history.filterOther" },
];

type AttemptState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ok";
      attempts: LearningAssessmentAttempt[];
      bestGrade: number | null;
      lastGrade: number | null;
    }
  | { status: "unavailable" | "error"; message: string };

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

export function LearnerLearningPanel({
  qcmAverage,
  recentQcmAverage,
}: {
  qcmAverage: number | null;
  recentQcmAverage: number | null;
}) {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab: Tab =
    searchParams.get("tab") === "quizzes" ? "quizzes" : "activities";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<LearningHistoryActivity[]>([]);
  const [assessments, setAssessments] = useState<LearningAssessmentSummary[]>(
    [],
  );
  const [filter, setFilter] = useState<LearningActivityFilter>("all");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attemptById, setAttemptById] = useState<Record<string, AttemptState>>(
    {},
  );
  const didMountFetch = useRef(false);

  const load = useCallback(async (fresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const qs = fresh ? "?fresh=1" : "";
      const res = await fetch(`/api/me/learning-history/activities${qs}`);
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        message?: string;
        code?: string;
        activities?: LearningHistoryActivity[];
        assessments?: LearningAssessmentSummary[];
      } | null;
      const interpreted = interpretActivitiesResponse({
        httpOk: res.ok,
        body,
      });
      if (!interpreted.ok) {
        setError(interpreted.error);
        setActivities([]);
        setAssessments([]);
        return;
      }
      setActivities(body?.activities ?? []);
      setAssessments(body?.assessments ?? []);
    } catch {
      setError(t("learner.dataUnavailable"));
      setActivities([]);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!shouldAutoFetchOnMount(didMountFetch.current)) return;
    didMountFetch.current = true;
    void load(false);
  }, [load]);

  function selectTab(next: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "quizzes") params.set("tab", "quizzes");
    else params.delete("tab");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

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

  const completedCount = useMemo(
    () => activities.filter((a) => a.status === "completed").length,
    [activities],
  );
  const totalCount = activities.length;
  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const scored = useMemo(() => scoredAssessments(assessments), [assessments]);
  const best = useMemo(() => bestAssessmentScore(assessments), [assessments]);

  async function loadAttempts(assessmentId: string) {
    setExpandedId(assessmentId);
    setAttemptById((p) => ({ ...p, [assessmentId]: { status: "loading" } }));
    try {
      const res = await fetch(
        `/api/me/learning-history/assessments/${encodeURIComponent(assessmentId)}/attempts`,
      );
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        unavailable?: boolean;
        message?: string;
        error?: string;
        attempts?: LearningAssessmentAttempt[];
        bestGrade?: number | null;
        lastGrade?: number | null;
      } | null;
      if (!res.ok || !body?.ok) {
        setAttemptById((p) => ({
          ...p,
          [assessmentId]: {
            status: "error",
            message:
              body?.error ?? t("learner.dataUnavailable"),
          },
        }));
        return;
      }
      if (body.unavailable) {
        setAttemptById((p) => ({
          ...p,
          [assessmentId]: {
            status: "unavailable",
            message:
              body.message ?? t("admin.history.attemptsUnavailable"),
          },
        }));
        return;
      }
      const attempts = body.attempts ?? [];
      const summary = summarizeAttempts(attempts);
      setAttemptById((p) => ({
        ...p,
        [assessmentId]: {
          status: "ok",
          attempts,
          bestGrade: body.bestGrade ?? summary.bestGrade,
          lastGrade: body.lastGrade ?? summary.lastGrade,
        },
      }));
    } catch {
      setAttemptById((p) => ({
        ...p,
        [assessmentId]: {
          status: "error",
          message: t("learner.dataUnavailable"),
        },
      }));
    }
  }

  const trendPoints = useMemo(() => {
    const points: Array<{ at: string; grade: number }> = [];
    for (const state of Object.values(attemptById)) {
      if (state.status !== "ok") continue;
      for (const a of state.attempts) {
        if (a.submittedAt && a.grade != null) {
          points.push({ at: a.submittedAt, grade: a.grade });
        }
      }
    }
    return points.sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  }, [attemptById]);

  return (
    <div className="ko-learn-board ko-dash-stagger">
      <section className="ko-learn-hero">
        <div className="ko-learn-hero-main">
          <p className="ko-learn-kicker">{t("learner.learningKicker")}</p>
          <h2 className="ko-learn-hero-title">{t("learner.learningTitle")}</h2>
          <p className="ko-learn-hero-sub">{t("learner.learn.heroSub")}</p>
          <div className="ko-learn-hero-stats">
            <div>
              <p>{totalCount > 0 ? `${completedCount}/${totalCount}` : "—"}</p>
              <span>{t("learner.learn.completed")}</span>
            </div>
            <div>
              <p>{formatPercentOrDash(qcmAverage)}</p>
              <span>{t("admin.file.qcmAverage")}</span>
            </div>
            <div>
              <p>{scored.length}</p>
              <span>{t("learner.learn.scoredQuizzes")}</span>
            </div>
          </div>
        </div>
        <div
          className="ko-learn-hero-ring"
          aria-label={
            totalCount > 0
              ? t("learner.learn.progressPct", { pct: progressPct })
              : t("learner.learn.progressUnavailable")
          }
        >
          <div
            className="ko-learn-hero-ring-viz"
            style={{
              background: `conic-gradient(#2563eb 0 ${progressPct}%, #e2e8f0 ${progressPct}% 100%)`,
            }}
          >
            <div className="ko-learn-hero-ring-hole">
              <p className="ko-learn-hero-ring-value">
                {totalCount > 0 ? `${progressPct}%` : "—"}
              </p>
              <p className="ko-learn-hero-ring-label">
                {t("learner.learn.realized")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="ko-learn-toolbar" role="tablist">
        <div className="ko-learn-tabs">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "activities"}
            onClick={() => selectTab("activities")}
            className={`ko-learn-tab${tab === "activities" ? " is-active" : ""}`}
          >
            {t("learner.learn.myActivities")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "quizzes"}
            onClick={() => selectTab("quizzes")}
            className={`ko-learn-tab${tab === "quizzes" ? " is-active" : ""}`}
          >
            {t("learner.learn.myQuizzes")}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void load(true)}
          className="ko-learn-refresh"
        >
          <Icon3dRefresh className="ko-learn-3d is-xs" />
          {t("common.refresh")}
        </button>
      </div>

      {loading ? (
        <p className="ko-learn-loading">{t("learner.learn.loading")}</p>
      ) : null}
      {error && !loading ? (
        <div className="ko-learn-error">
          <p>{error}</p>
          <button type="button" onClick={() => void load(true)}>
            {t("admin.learners.retry")}
          </button>
        </div>
      ) : null}

      {!loading && !error && tab === "activities" ? (
        <section className="ko-learn-panel">
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
                <li key={`${a.courseId}-${a.id}`} className="ko-learn-card">
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
                        {t("learner.learn.scoreLabel", {
                          value:
                            a.type === "assessmentV2"
                              ? formatScorePercent(a.score)
                              : "—",
                        })}
                      </span>
                      <span>
                        {t("learner.learn.timeLabel", {
                          value: formatDurationSeconds(a.timeOnUnitSeconds),
                        })}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="ko-learn-empty">
                {t("learner.learn.emptyFilter")}
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {!loading && !error && tab === "quizzes" ? (
        <section className="ko-learn-panel space-y-4">
          <div className="ko-learn-kpi-row">
            <MiniStat
              label={t("learner.learn.globalAvg")}
              value={
                qcmAverage == null
                  ? t("learner.progressUi.noResult")
                  : formatPercentOrDash(qcmAverage)
              }
              icon={<Icon3dQuiz className="ko-learn-3d is-sm" />}
            />
            <MiniStat
              label={t("learner.learn.recentAvg")}
              value={formatPercentOrDash(recentQcmAverage)}
              icon={<Icon3dQuiz className="ko-learn-3d is-sm" />}
            />
            <MiniStat
              label={t("admin.history.scoredEvals")}
              value={String(scored.length)}
            />
            <MiniStat
              label={t("admin.history.bestScore")}
              value={formatPercentOrDash(best)}
            />
          </div>

          {trendPoints.length >= 2 ? (
            <div className="ko-learn-trend">
              <p className="ko-learn-trend-label">{t("learner.learn.trend")}</p>
              <p className="ko-learn-trend-value">
                {trendPoints.map((p) => Math.round(p.grade)).join(" → ")}
              </p>
            </div>
          ) : scored.length > 0 ? (
            <p className="ko-learn-hint">{t("learner.learn.noTrend")}</p>
          ) : null}

          <ul className="ko-learn-list">
            {scored.map((a) => {
              const state = attemptById[a.id] ?? { status: "idle" as const };
              const open = expandedId === a.id;
              return (
                <li key={a.id} className="ko-learn-card">
                  <div className="ko-learn-card-icon">
                    <Icon3dQuiz />
                  </div>
                  <div className="ko-learn-card-body">
                    <div className="ko-learn-card-row">
                      <div>
                        <p className="ko-learn-card-title">{a.name}</p>
                        <p className="ko-learn-card-meta">
                          {a.section ?? t("admin.file.noSection")}
                        </p>
                        <p className="ko-learn-card-score">
                          {t("learner.learn.scoreLabel", {
                            value: formatScorePercent(a.score),
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (open) {
                            setExpandedId(null);
                            return;
                          }
                          void loadAttempts(a.id);
                        }}
                        className="ko-learn-cta"
                      >
                        {open
                          ? t("admin.history.hide")
                          : t("learner.learn.viewAttempts")}
                      </button>
                    </div>
                    {open ? (
                      <div className="ko-learn-attempts">
                        {state.status === "loading" ? (
                          <p className="ko-learn-hint">{t("common.loading")}</p>
                        ) : null}
                        {state.status === "unavailable" ||
                        state.status === "error" ? (
                          <p className="ko-learn-warn">{state.message}</p>
                        ) : null}
                        {state.status === "ok" ? (
                          <AttemptsList state={state} />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {scored.length === 0 ? (
              <li className="ko-learn-empty">
                {t("learner.learningEmptyQuizzes")}
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <article className="ko-learn-kpi">
      <div className="ko-learn-kpi-top">
        <p className="ko-learn-kpi-label">{label}</p>
        {icon}
      </div>
      <p className="ko-learn-kpi-value">{value}</p>
    </article>
  );
}

function AttemptsList({
  state,
}: {
  state: Extract<AttemptState, { status: "ok" }>;
}) {
  const { t, locale } = useLanguage();
  const chronological = [...state.attempts].sort((a, b) => {
    const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return ta - tb;
  });
  return (
    <div className="ko-learn-attempt-list">
      {chronological.map((attempt, i) => (
        <div key={attempt.id} className="ko-learn-attempt">
          <p className="ko-learn-attempt-title">
            {t("common.attemptN", { n: i + 1 })}
          </p>
          <p>{formatScorePercent(attempt.grade)}</p>
          <p className="ko-learn-attempt-date">
            {attempt.submittedAt
              ? formatDateTime(attempt.submittedAt, locale)
              : t("admin.history.dateUnavailable")}
          </p>
          {attempt.passed != null ? (
            <p className="ko-learn-attempt-pass">
              {attempt.passed
                ? t("admin.history.passed")
                : t("admin.history.failed")}
            </p>
          ) : null}
        </div>
      ))}
      {chronological.length > 1 ? (
        <p className="ko-learn-hint">
          {t("admin.history.attemptBestLast", {
            best: formatScorePercent(state.bestGrade),
            last: formatScorePercent(state.lastGrade),
          })}
        </p>
      ) : null}
    </div>
  );
}
