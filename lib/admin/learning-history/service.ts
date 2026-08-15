import "server-only";

import {
  getCachedAttempts,
  getCachedProgress,
  invalidateLearningHistoryCache,
  setCachedAttempts,
  setCachedProgress,
} from "@/lib/admin/learning-history/cache";
import {
  bestAssessmentScore,
  parseAssessmentAttempts,
  parseLearningHistoryFromProgress,
  scoredAssessments,
  summarizeAttempts,
} from "@/lib/admin/learning-history/parse";
import { createLearnWorldsClient } from "@/lib/learnworlds/client";
import { LEARNWORLDS_PATHS, lwPath } from "@/lib/learnworlds/config";
import { LearnWorldsApiError } from "@/lib/learnworlds/errors";
import { asRecord } from "@/lib/learnworlds/mappers";
import { getUserCourseProgressList } from "@/lib/learnworlds/progress";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  LearningAssessmentAttempt,
  LearnerLearningHistory,
} from "@/types/learning-history";

export {
  invalidateLearningHistoryCache,
  LEARNING_HISTORY_CACHE_TTL_MS,
} from "@/lib/admin/learning-history/cache";

export class LearningHistoryError extends Error {
  constructor(
    message: string,
    readonly code:
      | "NO_LW_ID"
      | "NOT_FOUND"
      | "UNAVAILABLE"
      | "ATTEMPTS_UNAVAILABLE"
      | "RATE_LIMITED",
    readonly status = 502,
  ) {
    super(message);
    this.name = "LearningHistoryError";
  }
}

export async function resolveStudentLearnWorldsId(
  studentId: string,
): Promise<{ learnworldsUserId: string } | null> {
  const db = createAdminClient();
  const { data, error } = await db
    .from("students")
    .select("learnworlds_user_id")
    .eq("id", studentId)
    .maybeSingle();

  if (error) {
    throw new LearningHistoryError(
      "Historique temporairement indisponible.",
      "UNAVAILABLE",
      503,
    );
  }
  if (!data) return null;
  const lwId = data.learnworlds_user_id?.trim();
  if (!lwId) {
    throw new LearningHistoryError(
      "Aucun identifiant LearnWorlds pour cet apprenant.",
      "NO_LW_ID",
      422,
    );
  }
  return { learnworldsUserId: lwId };
}

async function fetchProgressRaw(
  learnworldsUserId: string,
  fresh: boolean,
): Promise<unknown[]> {
  if (!fresh) {
    const cached = getCachedProgress(learnworldsUserId);
    if (cached) return cached;
  }

  try {
    const list = await getUserCourseProgressList(learnworldsUserId);
    const raw = list.map((item) => item.raw ?? item);
    setCachedProgress(learnworldsUserId, raw);
    return raw;
  } catch (error) {
    if (error instanceof LearnWorldsApiError && error.status === 429) {
      throw new LearningHistoryError(
        "Historique temporairement indisponible.",
        "RATE_LIMITED",
        429,
      );
    }
    throw new LearningHistoryError(
      "Historique temporairement indisponible.",
      "UNAVAILABLE",
      502,
    );
  }
}

export async function getLearnerLearningHistory(
  studentId: string,
  options: { fresh?: boolean } = {},
): Promise<LearnerLearningHistory> {
  const resolved = await resolveStudentLearnWorldsId(studentId);
  if (!resolved) {
    throw new LearningHistoryError(
      "Apprenant introuvable.",
      "NOT_FOUND",
      404,
    );
  }

  const fresh = Boolean(options.fresh);
  if (fresh) invalidateLearningHistoryCache(resolved.learnworldsUserId);

  const raw = await fetchProgressRaw(resolved.learnworldsUserId, fresh);
  return parseLearningHistoryFromProgress(resolved.learnworldsUserId, raw);
}

export type AssessmentAttemptsResult =
  | {
      status: "ok";
      assessmentId: string;
      attempts: LearningAssessmentAttempt[];
      bestGrade: number | null;
      lastGrade: number | null;
      lastSubmittedAt: string | null;
    }
  | {
      status: "unavailable";
      assessmentId: string;
      message: string;
    };

export async function getAssessmentAttemptsForStudent(
  studentId: string,
  assessmentId: string,
  options: { fresh?: boolean } = {},
): Promise<AssessmentAttemptsResult> {
  const resolved = await resolveStudentLearnWorldsId(studentId);
  if (!resolved) {
    throw new LearningHistoryError(
      "Apprenant introuvable.",
      "NOT_FOUND",
      404,
    );
  }

  const lwUserId = resolved.learnworldsUserId;
  const fresh = Boolean(options.fresh);
  const cacheKeyAssessment = assessmentId.trim();
  if (!cacheKeyAssessment) {
    throw new LearningHistoryError(
      "Assessment invalide.",
      "NOT_FOUND",
      404,
    );
  }

  if (!fresh) {
    const cached = getCachedAttempts(lwUserId, cacheKeyAssessment);
    if (cached) {
      const attempts = parseAssessmentAttempts(cached);
      const summary = summarizeAttempts(attempts);
      return {
        status: "ok",
        assessmentId: cacheKeyAssessment,
        attempts,
        ...summary,
      };
    }
  }

  const client = createLearnWorldsClient();
  const path =
    lwPath(LEARNWORLDS_PATHS.userAssessments, { id: cacheKeyAssessment }) +
    `?users=${encodeURIComponent(lwUserId)}&items_per_page=50`;

  try {
    const raw = await client.request<unknown>(path);
    const body = asRecord(raw);
    const data = Array.isArray(body.data) ? body.data : [];
    setCachedAttempts(lwUserId, cacheKeyAssessment, data);
    const attempts = parseAssessmentAttempts(data);
    const summary = summarizeAttempts(attempts);
    return {
      status: "ok",
      assessmentId: cacheKeyAssessment,
      attempts,
      ...summary,
    };
  } catch (error) {
    if (error instanceof LearnWorldsApiError && error.status === 404) {
      return {
        status: "unavailable",
        assessmentId: cacheKeyAssessment,
        message: "Score disponible, détail des tentatives indisponible.",
      };
    }
    if (error instanceof LearnWorldsApiError && error.status === 429) {
      throw new LearningHistoryError(
        "Détail des tentatives indisponible.",
        "RATE_LIMITED",
        429,
      );
    }
    throw new LearningHistoryError(
      "Détail des tentatives indisponible.",
      "ATTEMPTS_UNAVAILABLE",
      502,
    );
  }
}

export function buildQuizPanelMetrics(
  history: LearnerLearningHistory,
  qcmAverage: number | null,
  recentQcmAverage: number | null,
) {
  const scored = scoredAssessments(history.assessments);
  return {
    scoredCount: scored.length,
    bestScore: bestAssessmentScore(history.assessments),
    qcmAverage,
    recentQcmAverage,
    scoredAssessments: scored,
    allAssessments: history.assessments,
  };
}
