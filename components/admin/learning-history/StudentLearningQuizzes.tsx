"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Icon3dQuiz,
  Icon3dRefresh,
} from "@/components/learning/Learning3dIcons";
import {
  bestAssessmentScore,
  formatScorePercent,
  scoredAssessments,
  summarizeAttempts,
} from "@/lib/admin/learning-history/parse";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDateTime } from "@/lib/i18n/format-date";
import { activityStatusKey } from "@/lib/i18n/labels";
import type {
  LearningAssessmentAttempt,
  LearningAssessmentSummary,
} from "@/types/learning-history";

type AttemptState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ok";
      attempts: LearningAssessmentAttempt[];
      bestGrade: number | null;
      lastGrade: number | null;
      lastSubmittedAt: string | null;
    }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string };

export function StudentLearningQuizzes({
  studentId,
  loading,
  error,
  assessments,
  qcmAverage,
  recentQcmAverage,
  onRefresh,
}: {
  studentId: string;
  loading: boolean;
  error: string | null;
  assessments: LearningAssessmentSummary[];
  qcmAverage: number | null;
  recentQcmAverage: number | null;
  onRefresh: () => void;
}) {
  const { t, locale } = useLanguage();
  const scored = useMemo(() => scoredAssessments(assessments), [assessments]);
  const bestScore = useMemo(
    () => bestAssessmentScore(assessments),
    [assessments],
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [attemptById, setAttemptById] = useState<Record<string, AttemptState>>(
    {},
  );

  async function loadAttempts(assessmentId: string, fresh = false) {
    setExpandedId(assessmentId);
    setAttemptById((prev) => ({
      ...prev,
      [assessmentId]: { status: "loading" },
    }));
    try {
      const qs = fresh ? "?fresh=1" : "";
      const res = await fetch(
        `/api/admin/students/${studentId}/learning-history/assessments/${encodeURIComponent(assessmentId)}/attempts${qs}`,
      );
      const body = (await res.json().catch(() => null)) as {
        ok?: boolean;
        unavailable?: boolean;
        message?: string;
        error?: string;
        attempts?: LearningAssessmentAttempt[];
        bestGrade?: number | null;
        lastGrade?: number | null;
        lastSubmittedAt?: string | null;
      } | null;

      if (!res.ok || !body?.ok) {
        setAttemptById((prev) => ({
          ...prev,
          [assessmentId]: {
            status: "error",
            message: body?.error ?? t("admin.history.attemptsUnavailable"),
          },
        }));
        return;
      }

      if (body.unavailable) {
        setAttemptById((prev) => ({
          ...prev,
          [assessmentId]: {
            status: "unavailable",
            message:
              body.message ?? t("admin.history.scoreWithoutAttempts"),
          },
        }));
        return;
      }

      const attempts = body.attempts ?? [];
      const summary = summarizeAttempts(attempts);
      setAttemptById((prev) => ({
        ...prev,
        [assessmentId]: {
          status: "ok",
          attempts,
          bestGrade: body.bestGrade ?? summary.bestGrade,
          lastGrade: body.lastGrade ?? summary.lastGrade,
          lastSubmittedAt: body.lastSubmittedAt ?? summary.lastSubmittedAt,
        },
      }));
    } catch {
      setAttemptById((prev) => ({
        ...prev,
        [assessmentId]: {
          status: "error",
          message: t("admin.history.attemptsUnavailable"),
        },
      }));
    }
  }

  return (
    <section className="ko-learn-panel space-y-4">
      <div className="ko-learn-panel-head">
        <div className="ko-learn-panel-title-row">
          <span className="ko-learn-card-icon" aria-hidden>
            <Icon3dQuiz className="ko-learn-3d is-sm" />
          </span>
          <div>
            <h2 className="ko-learn-panel-title">{t("admin.file.quizzes")}</h2>
            <p className="ko-learn-panel-sub">
              {t("admin.history.scoresHint")}
            </p>
          </div>
        </div>
        <button type="button" onClick={onRefresh} className="ko-learn-refresh">
          <Icon3dRefresh className="ko-learn-3d is-xs" />
          {t("common.refresh")}
        </button>
      </div>

      {loading ? (
        <p className="ko-learn-loading">{t("common.loading")}</p>
      ) : null}
      {error ? (
        <div className="ko-learn-error">
          <p>{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="ko-learn-kpi-row">
            <MiniStat
              label={t("admin.file.qcmAverage")}
              value={formatScorePercent(qcmAverage)}
              icon={<Icon3dQuiz className="ko-learn-3d is-sm" />}
            />
            <MiniStat
              label={t("admin.file.recentQcm")}
              value={formatScorePercent(recentQcmAverage)}
              icon={<Icon3dQuiz className="ko-learn-3d is-sm" />}
            />
            <MiniStat
              label={t("admin.history.scoredEvals")}
              value={String(scored.length)}
            />
            <MiniStat
              label={t("admin.history.bestScore")}
              value={formatScorePercent(bestScore)}
            />
          </div>

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
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="ko-learn-card-title">{a.name}</p>
                        <p className="ko-learn-card-meta">
                          {a.section ?? t("admin.file.noSection")} ·{" "}
                          {t(activityStatusKey(a.status))}
                        </p>
                        <div className="ko-learn-card-foot">
                          <span>
                            {t("common.score")}{" "}
                            <strong>{formatScorePercent(a.score)}</strong>
                          </span>
                          <span>
                            {t("common.attempts")} :{" "}
                            {state.status === "ok"
                              ? String(state.attempts.length)
                              : state.status === "unavailable"
                                ? t("admin.history.unavailable")
                                : t("admin.history.notLoaded")}
                          </span>
                          <span>
                            {t("common.date")} :{" "}
                            {state.status === "ok" && state.lastSubmittedAt
                              ? formatDateTime(state.lastSubmittedAt, locale)
                              : "—"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (open && state.status !== "idle") {
                            setExpandedId(null);
                            return;
                          }
                          void loadAttempts(a.id, false);
                        }}
                        className="ko-learn-refresh shrink-0"
                      >
                        {open ? t("admin.history.hide") : t("admin.history.viewAttempts")}
                      </button>
                    </div>

                    {open ? (
                      <div className="mt-3 border-t border-slate-200/80 pt-3">
                        {state.status === "loading" ? (
                          <p className="ko-learn-loading">
                            {t("admin.history.loadingAttempts")}
                          </p>
                        ) : null}
                        {state.status === "unavailable" ||
                        state.status === "error" ? (
                          <p className="text-sm font-medium text-amber-800">
                            {state.message}
                          </p>
                        ) : null}
                        {state.status === "ok" ? (
                          <AttemptsDetail state={state} locale={locale} />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {scored.length === 0 ? (
              <li className="ko-learn-empty">
                {t("admin.history.noScored")}
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
    </section>
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

function AttemptsDetail({
  state,
  locale,
}: {
  state: Extract<AttemptState, { status: "ok" }>;
  locale: import("@/lib/i18n/storage").Locale;
}) {
  const { t } = useLanguage();
  const chronological = [...state.attempts].sort((a, b) => {
    const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return ta - tb;
  });

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {chronological.map((attempt, index) => (
          <li
            key={attempt.id}
            className="rounded-xl border border-slate-100 bg-white px-3 py-2.5 text-sm shadow-sm"
          >
            <p className="font-semibold text-slate-900">
              {t("common.attemptN", { n: index + 1 })}
            </p>
            <p className="text-slate-700">
              {formatScorePercent(attempt.grade)}
            </p>
            <p className="text-xs text-slate-500">
              {attempt.submittedAt
                ? formatDateTime(attempt.submittedAt, locale)
                : t("admin.history.dateUnavailable")}
            </p>
            {attempt.passed != null ? (
              <p className="text-xs text-slate-600">
                {attempt.passed
                  ? t("admin.history.passed")
                  : t("admin.history.failed")}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      {chronological.length > 1 ? (
        <p className="text-xs text-slate-600">
          {t("admin.history.attemptBestLast", {
            best: formatScorePercent(state.bestGrade),
            last: formatScorePercent(state.lastGrade),
          })}
        </p>
      ) : null}
      {chronological.length === 0 ? (
        <p className="text-sm text-slate-500">{t("admin.history.noAttempts")}</p>
      ) : null}
    </div>
  );
}
