"use client";

import { useMemo, useState } from "react";
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
    <section className="rounded-[1.5rem] bg-white p-4 shadow-[0_12px_40px_-24px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/80 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ko-display text-lg font-semibold text-slate-900">
            Quiz & examens
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Scores LearnWorlds — tentatives chargées à la demande.
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
        <p className="mt-6 text-sm text-slate-500">Chargement…</p>
      ) : null}
      {error ? (
        <p className="mt-6 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Moyenne QCM"
              value={formatScorePercent(qcmAverage)}
            />
            <Metric
              label="Moyenne récente"
              value={formatScorePercent(recentQcmAverage)}
            />
            <Metric
              label="Évaluations scorées"
              value={String(scored.length)}
            />
            <Metric
              label="Meilleur score"
              value={formatScorePercent(bestScore)}
            />
          </div>

          <ul className="mt-5 space-y-3">
            {scored.map((a) => {
              const state = attemptById[a.id] ?? { status: "idle" as const };
              const open = expandedId === a.id;
              return (
                <li
                  key={a.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {a.name}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {a.section ?? "Sans section"} ·{" "}
                        {activityStatusLabelFr(a.status)}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        Score enregistré{" "}
                        <span className="font-semibold">
                          {formatScorePercent(a.score)}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Tentatives :{" "}
                        {state.status === "ok"
                          ? String(state.attempts.length)
                          : state.status === "unavailable"
                            ? "Indisponible"
                            : "Non chargées"}
                        {" · "}
                        Date :{" "}
                        {state.status === "ok" && state.lastSubmittedAt
                          ? formatDateTimeFr(state.lastSubmittedAt)
                          : "—"}
                      </p>
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
                      className="shrink-0 rounded-full bg-[var(--admin-blue)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                    >
                      {open ? "Masquer" : "Voir les tentatives"}
                    </button>
                  </div>

                  {open ? (
                    <div className="mt-3 border-t border-slate-200/80 pt-3">
                      {state.status === "loading" ? (
                        <p className="text-sm text-slate-500">
                          Chargement des tentatives…
                        </p>
                      ) : null}
                      {state.status === "unavailable" ||
                      state.status === "error" ? (
                        <p className="text-sm text-amber-800">
                          {state.message}
                        </p>
                      ) : null}
                      {state.status === "ok" ? (
                        <AttemptsDetail state={state} />
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
            {scored.length === 0 ? (
              <li className="text-sm text-slate-500">
                Aucune évaluation scorée pour cet apprenant.
              </li>
            ) : null}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
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
            className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-100"
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
