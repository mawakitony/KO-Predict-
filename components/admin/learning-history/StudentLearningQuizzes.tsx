"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Icon3dQuiz,
  Icon3dRefresh,
} from "@/components/learning/Learning3dIcons";
import {
  activityStatusLabelFr,
  bestAssessmentScore,
  formatScorePercent,
  scoredAssessments,
  summarizeAttempts,
} from "@/lib/admin/learning-history/parse";
import { formatDateTimeFr } from "@/lib/dashboard/format";
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
            message: body?.error ?? "Détail des tentatives indisponible.",
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
              body.message ??
              "Score disponible, détail des tentatives indisponible.",
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
          message: "Détail des tentatives indisponible.",
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
            <h2 className="ko-learn-panel-title">Quiz &amp; examens</h2>
            <p className="ko-learn-panel-sub">
              Scores LearnWorlds — tentatives chargées à la demande.
            </p>
          </div>
        </div>
        <button type="button" onClick={onRefresh} className="ko-learn-refresh">
          <Icon3dRefresh className="ko-learn-3d is-xs" />
          Actualiser
        </button>
      </div>

      {loading ? <p className="ko-learn-loading">Chargement…</p> : null}
      {error ? (
        <div className="ko-learn-error">
          <p>{error}</p>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="ko-learn-kpi-row">
            <MiniStat
              label="Moyenne QCM"
              value={formatScorePercent(qcmAverage)}
              icon={<Icon3dQuiz className="ko-learn-3d is-sm" />}
            />
            <MiniStat
              label="Moyenne récente"
              value={formatScorePercent(recentQcmAverage)}
              icon={<Icon3dQuiz className="ko-learn-3d is-sm" />}
            />
            <MiniStat
              label="Évaluations scorées"
              value={String(scored.length)}
            />
            <MiniStat
              label="Meilleur score"
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
                          {a.section ?? "Sans section"} ·{" "}
                          {activityStatusLabelFr(a.status)}
                        </p>
                        <div className="ko-learn-card-foot">
                          <span>
                            Score{" "}
                            <strong>{formatScorePercent(a.score)}</strong>
                          </span>
                          <span>
                            Tentatives :{" "}
                            {state.status === "ok"
                              ? String(state.attempts.length)
                              : state.status === "unavailable"
                                ? "Indisponible"
                                : "Non chargées"}
                          </span>
                          <span>
                            Date :{" "}
                            {state.status === "ok" && state.lastSubmittedAt
                              ? formatDateTimeFr(state.lastSubmittedAt)
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
                        {open ? "Masquer" : "Voir les tentatives"}
                      </button>
                    </div>

                    {open ? (
                      <div className="mt-3 border-t border-slate-200/80 pt-3">
                        {state.status === "loading" ? (
                          <p className="ko-learn-loading">
                            Chargement des tentatives…
                          </p>
                        ) : null}
                        {state.status === "unavailable" ||
                        state.status === "error" ? (
                          <p className="text-sm font-medium text-amber-800">
                            {state.message}
                          </p>
                        ) : null}
                        {state.status === "ok" ? (
                          <AttemptsDetail state={state} />
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {scored.length === 0 ? (
              <li className="ko-learn-empty">
                Aucune évaluation scorée pour cet apprenant.
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
}: {
  state: Extract<AttemptState, { status: "ok" }>;
}) {
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
              Tentative {index + 1}
            </p>
            <p className="text-slate-700">
              {formatScorePercent(attempt.grade)}
            </p>
            <p className="text-xs text-slate-500">
              {attempt.submittedAt
                ? formatDateTimeFr(attempt.submittedAt)
                : "Date indisponible"}
            </p>
            {attempt.passed != null ? (
              <p className="text-xs text-slate-600">
                {attempt.passed ? "Réussi" : "Non réussi"}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
      {chronological.length > 1 ? (
        <p className="text-xs text-slate-600">
          Meilleur score {formatScorePercent(state.bestGrade)} · Dernier score{" "}
          {formatScorePercent(state.lastGrade)}
        </p>
      ) : null}
      {chronological.length === 0 ? (
        <p className="text-sm text-slate-500">Aucune tentative trouvée.</p>
      ) : null}
    </div>
  );
}
