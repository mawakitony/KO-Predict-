"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  activityStatusLabelFr,
  activityTypeLabelFr,
  bestAssessmentScore,
  formatDurationSeconds,
  formatScorePercent,
  matchesActivityFilter,
  scoredAssessments,
  summarizeAttempts,
} from "@/lib/admin/learning-history/parse";
import { formatDateTimeFr } from "@/lib/dashboard/format";
import { formatPercentOrDash } from "@/lib/learning/format";
import {
  interpretActivitiesResponse,
  LEARNER_HISTORY_TEMPORARY_MESSAGE,
  shouldAutoFetchOnMount,
} from "@/lib/learning/lw-id";
import type {
  LearningActivityFilter,
  LearningAssessmentAttempt,
  LearningAssessmentSummary,
  LearningHistoryActivity,
} from "@/types/learning-history";

type Tab = "activities" | "quizzes";

const FILTERS: Array<{ id: LearningActivityFilter; label: string }> = [
  { id: "all", label: "Toutes" },
  { id: "completed", label: "Terminées" },
  { id: "not_completed", label: "À faire" },
  { id: "quiz", label: "Quiz" },
  { id: "videos", label: "Vidéos" },
  { id: "documents", label: "Documents" },
  { id: "other", label: "Autres" },
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

export function LearnerLearningPanel({
  qcmAverage,
  recentQcmAverage,
}: {
  qcmAverage: number | null;
  recentQcmAverage: number | null;
}) {
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
      setError(LEARNER_HISTORY_TEMPORARY_MESSAGE);
      setActivities([]);
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, []);

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
              body?.error ??
              "Vos données LearnWorlds sont temporairement indisponibles.",
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
              body.message ??
              "Détail des tentatives indisponible pour le moment.",
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
          message:
            "Vos données LearnWorlds sont temporairement indisponibles.",
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
    <div className="space-y-4">
      <div
        role="tablist"
        className="flex flex-wrap gap-1 rounded-full bg-slate-100/90 p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "activities"}
          onClick={() => selectTab("activities")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            tab === "activities"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600"
          }`}
        >
          Mes activités
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "quizzes"}
          onClick={() => selectTab("quizzes")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${
            tab === "quizzes"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600"
          }`}
        >
          Mes quiz &amp; examens
        </button>
        <button
          type="button"
          onClick={() => void load(true)}
          className="ml-auto rounded-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white"
        >
          Actualiser
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Chargement de votre parcours…</p>
      ) : null}
      {error && !loading ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-4 text-sm text-rose-800">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void load(true)}
            className="mt-3 inline-flex rounded-full bg-rose-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-800"
          >
            Réessayer
          </button>
        </div>
      ) : null}

      {!loading && !error && tab === "activities" ? (
        <section className="ko-dash-card p-4 sm:p-5">
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  filter === f.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-600"
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
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
          <ul className="mt-4 space-y-3">
            {filtered.map((a) => (
              <li
                key={`${a.courseId}-${a.id}`}
                className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 px-4 py-3"
              >
                <p className="font-semibold text-slate-900">{a.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {a.section ?? "Sans section"} · {activityTypeLabelFr(a.type)}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                  <span>{activityStatusLabelFr(a.status)}</span>
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
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="text-sm text-slate-500">
                Aucune activité pour ce filtre.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {!loading && !error && tab === "quizzes" ? (
        <section className="ko-dash-card space-y-4 p-4 sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MiniStat
              label="Moyenne globale"
              value={
                qcmAverage == null
                  ? "Pas encore de résultat"
                  : formatPercentOrDash(qcmAverage)
              }
            />
            <MiniStat
              label="Moyenne récente"
              value={formatPercentOrDash(recentQcmAverage)}
            />
            <MiniStat
              label="Évaluations scorées"
              value={String(scored.length)}
            />
            <MiniStat
              label="Meilleur score"
              value={formatPercentOrDash(best)}
            />
          </div>

          {trendPoints.length >= 2 ? (
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Évolution de mes résultats
              </p>
              <p className="mt-2 text-sm font-medium text-slate-800">
                {trendPoints.map((p) => Math.round(p.grade)).join(" → ")}
              </p>
            </div>
          ) : scored.length > 0 ? (
            <p className="text-sm text-slate-500">
              Pas encore assez de résultats datés pour afficher une tendance.
              Ouvrez quelques tentatives ci-dessous.
            </p>
          ) : null}

          <ul className="space-y-3">
            {scored.map((a) => {
              const state = attemptById[a.id] ?? { status: "idle" as const };
              const open = expandedId === a.id;
              return (
                <li
                  key={a.id}
                  className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{a.name}</p>
                      <p className="text-xs text-slate-500">
                        {a.section ?? "Sans section"}
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        Score :{" "}
                        <span className="font-semibold">
                          {formatScorePercent(a.score)}
                        </span>
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
                      className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      {open ? "Masquer" : "Voir mes tentatives"}
                    </button>
                  </div>
                  {open ? (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {state.status === "loading" ? (
                        <p className="text-sm text-slate-500">Chargement…</p>
                      ) : null}
                      {state.status === "unavailable" ||
                      state.status === "error" ? (
                        <p className="text-sm text-amber-800">{state.message}</p>
                      ) : null}
                      {state.status === "ok" ? (
                        <AttemptsList state={state} />
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
            {scored.length === 0 ? (
              <li className="rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
                Pas encore de résultat QCM. Vos scores apparaîtront après vos
                premiers quiz LearnWorlds.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function AttemptsList({
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
    <div className="space-y-2">
      {chronological.map((attempt, i) => (
        <div
          key={attempt.id}
          className="rounded-xl bg-slate-50 px-3 py-2 text-sm"
        >
          <p className="font-semibold text-slate-900">Tentative {i + 1}</p>
          <p>{formatScorePercent(attempt.grade)}</p>
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
        </div>
      ))}
      {chronological.length > 1 ? (
        <p className="text-xs text-slate-600">
          Meilleur score {formatScorePercent(state.bestGrade)} · Dernier score{" "}
          {formatScorePercent(state.lastGrade)}
        </p>
      ) : null}
    </div>
  );
}
