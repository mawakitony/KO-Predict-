import "server-only";

import {
  LearningHistoryError,
  resolveStudentLearnWorldsId,
} from "@/lib/admin/learning-history/service";
import {
  getCachedProgress,
  setCachedProgress,
} from "@/lib/admin/learning-history/cache";
import {
  getCachedCoursesCatalog,
  setCachedCoursesCatalog,
} from "@/lib/admin/courses-catalog-cache";
import {
  buildLearnerFormationView,
  emptyLearnerFormation,
  type LearnerFormationView,
} from "@/lib/admin/learner-formation";
import { createLearnWorldsClient } from "@/lib/learnworlds/client";
import { LEARNWORLDS_PATHS, isLearnWorldsConfigured, lwPath } from "@/lib/learnworlds/config";
import { LearnWorldsApiError } from "@/lib/learnworlds/errors";
import { asRecord } from "@/lib/learnworlds/mappers";
import { listCourses } from "@/lib/learnworlds/progress";

async function loadProgressRawSafe(studentId: string): Promise<unknown[]> {
  try {
    const resolved = await resolveStudentLearnWorldsId(studentId);
    if (!resolved) return [];

    const cached = getCachedProgress(resolved.learnworldsUserId);
    if (cached) return cached;

    const client = createLearnWorldsClient();
    const path = lwPath(LEARNWORLDS_PATHS.userProgress, {
      id: resolved.learnworldsUserId,
    });
    const raw = await client.request<unknown>(path);
    const body = asRecord(raw);
    const data = Array.isArray(body.data)
      ? body.data
      : Array.isArray(raw)
        ? raw
        : [];
    setCachedProgress(resolved.learnworldsUserId, data);
    return data;
  } catch (error) {
    if (error instanceof LearningHistoryError) {
      return [];
    }
    if (
      error instanceof LearnWorldsApiError &&
      (error.status === 404 || error.status === 400)
    ) {
      return [];
    }
    return [];
  }
}

async function loadCoursesCatalog(): Promise<
  import("@/types/learnworlds").LearnWorldsCourse[]
> {
  const cached = getCachedCoursesCatalog();
  if (cached) return cached;
  const courses = await listCourses();
  setCachedCoursesCatalog(courses);
  return courses;
}

/** Lecture seule — n’écrit ni la certification persistée ni LearnWorlds. */
export async function loadAdminLearnerFormation(
  studentId: string,
): Promise<LearnerFormationView> {
  if (!isLearnWorldsConfigured()) {
    return emptyLearnerFormation();
  }
  try {
    const progressItems = await loadProgressRawSafe(studentId);
    let catalog: import("@/types/learnworlds").LearnWorldsCourse[] = [];
    try {
      catalog = await loadCoursesCatalog();
    } catch {
      catalog = getCachedCoursesCatalog() ?? [];
    }
    return buildLearnerFormationView(progressItems, catalog);
  } catch {
    return emptyLearnerFormation();
  }
}
