import "server-only";

import {
  createLearnWorldsClient,
  type LearnWorldsClient,
} from "@/lib/learnworlds/client";
import { LEARNWORLDS_PATHS, lwPath } from "@/lib/learnworlds/config";
import { LearnWorldsApiError } from "@/lib/learnworlds/errors";
import { asNumber, asRecord, asString, unixToIso } from "@/lib/learnworlds/mappers";
import type {
  LearnWorldsCourse,
  LearnWorldsCourseProgress,
  LearnWorldsEnrollment,
} from "@/types/learnworlds";

export { aggregateCourseProgress } from "@/lib/learnworlds/aggregations";

/**
 * GET /v2/users/{id}/enrollments
 * Confirmé OpenAPI enrollments (community) aligné learnworlds.dev
 */
export async function listUserEnrollments(
  userId: string,
  client: LearnWorldsClient = createLearnWorldsClient(),
): Promise<LearnWorldsEnrollment[]> {
  const path = lwPath(LEARNWORLDS_PATHS.userEnrollments, { id: userId });
  try {
    const raw = await client.request<unknown>(path);
    const body = asRecord(raw);
    const data = Array.isArray(body.data) ? body.data : [];
    return data.map((item) => {
      const row = asRecord(item);
      return {
        userId,
        courseId: asString(row.productId ?? row.course_id ?? row.id) ?? "",
        enrolledAt: unixToIso(row.created),
        raw: item,
      };
    });
  } catch (error) {
    if (error instanceof LearnWorldsApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * GET /v2/users/{id}/progress
 * Confirmé live (404 = pas de data) + OpenAPI progress (progress_rate, units).
 */
export async function getUserCourseProgressList(
  userId: string,
  client: LearnWorldsClient = createLearnWorldsClient(),
): Promise<LearnWorldsCourseProgress[]> {
  const path = lwPath(LEARNWORLDS_PATHS.userProgress, { id: userId });
  try {
    const raw = await client.request<unknown>(path);
    const body = asRecord(raw);
    const data = Array.isArray(body.data)
      ? body.data
      : Array.isArray(raw)
        ? raw
        : [];

    return data.map((item) => {
      const row = asRecord(item);
      return {
        userId: asString(row.user_id) ?? userId,
        courseId: asString(row.course_id) ?? "",
        progressPercent: asNumber(row.progress_rate ?? row.progress_percent),
        completedActivities: asNumber(
          row.completed_units ?? row.completed_activities,
        ),
        totalActivities: asNumber(row.total_units ?? row.total_activities),
        studyTimeMinutes: (() => {
          const minutes = asNumber(row.study_time_minutes);
          if (minutes != null) return minutes;
          // LearnWorlds WOLOYEM: time_on_course est en secondes.
          const seconds = asNumber(
            row.time_on_course ?? row.total_time_seconds,
          );
          return seconds != null ? seconds / 60 : null;
        })(),
        status: asString(row.status),
        raw: item,
      };
    });
  } catch (error) {
    if (error instanceof LearnWorldsApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

/** @deprecated Prefer getUserCourseProgressList — conservé pour compat Phase 9. */
export async function getUserCourseProgress(
  userId: string,
  courseId: string,
  client: LearnWorldsClient = createLearnWorldsClient(),
): Promise<LearnWorldsCourseProgress> {
  const all = await getUserCourseProgressList(userId, client);
  const found = all.find((p) => p.courseId === courseId);
  if (!found) {
    throw new LearnWorldsApiError(
      `Progression introuvable pour le cours ${courseId}`,
      404,
    );
  }
  return found;
}

export async function listCourses(
  client: LearnWorldsClient = createLearnWorldsClient(),
): Promise<LearnWorldsCourse[]> {
  const raw = await client.request<unknown>(`${LEARNWORLDS_PATHS.courses}?page=1`);
  const body = asRecord(raw);
  const data = Array.isArray(body.data) ? body.data : [];
  return data.map((item) => {
    const row = asRecord(item);
    return {
      id: String(row.id),
      title: asString(row.title),
      raw: item,
    };
  });
}
