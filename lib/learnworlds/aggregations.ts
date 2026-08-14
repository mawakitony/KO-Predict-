import type {
  LearnWorldsActivityEvent,
  LearnWorldsAssessmentScore,
  LearnWorldsCourseProgress,
} from "@/types/learnworlds";

export function aggregateCourseProgress(
  items: LearnWorldsCourseProgress[],
): {
  progressPercent: number | null;
  completedActivities: number | null;
  totalActivities: number | null;
  studyTimeMinutes: number | null;
} {
  if (items.length === 0) {
    return {
      progressPercent: null,
      completedActivities: null,
      totalActivities: null,
      studyTimeMinutes: null,
    };
  }

  let completed = 0;
  let total = 0;
  let study = 0;
  let hasActivities = false;
  let hasStudy = false;
  const percents: number[] = [];

  for (const item of items) {
    if (item.progressPercent != null) percents.push(item.progressPercent);
    if (item.completedActivities != null && item.totalActivities != null) {
      completed += item.completedActivities;
      total += item.totalActivities;
      hasActivities = true;
    }
    if (item.studyTimeMinutes != null) {
      study += item.studyTimeMinutes;
      hasStudy = true;
    }
  }

  const progressPercent =
    hasActivities && total > 0
      ? Math.min(100, Math.max(0, (completed / total) * 100))
      : percents.length > 0
        ? percents.reduce((a, b) => a + b, 0) / percents.length
        : null;

  return {
    progressPercent,
    completedActivities: hasActivities ? completed : null,
    totalActivities: hasActivities ? total : null,
    studyTimeMinutes: hasStudy ? study : null,
  };
}

export function summarizeAssessmentScores(
  scores: LearnWorldsAssessmentScore[],
  recentCount = 5,
): { qcmAverage: number | null; recentQcmAverage: number | null } {
  const valid = scores.filter(
    (s) => s.scorePercent != null && Number.isFinite(s.scorePercent),
  );

  if (valid.length === 0) {
    return { qcmAverage: null, recentQcmAverage: null };
  }

  const qcmAverage =
    valid.reduce((sum, s) => sum + (s.scorePercent as number), 0) /
    valid.length;

  const hasAnyDate = valid.some((s) => Boolean(s.completedAt));
  const recent = hasAnyDate
    ? [...valid]
        .sort((a, b) => {
          const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return tb - ta;
        })
        .slice(0, recentCount)
    : // V1 : pas encore un « récent chronologique ».
      // Sans timestamp (progress units) → N derniers dans l’ordre pédagogique LW.
      valid.slice(-recentCount);

  const recentQcmAverage =
    recent.reduce((sum, s) => sum + (s.scorePercent as number), 0) /
    recent.length;

  return { qcmAverage, recentQcmAverage };
}

/**
 * Extrait les scores QCM depuis le payload progress déjà chargé.
 * Source confirmée live WOLOYEM :
 * - unit_type = "assessmentV2"
 * - score_on_unit = pourcentage (0 inclus si réel)
 *
 * Ne déduit jamais un score depuis la progression.
 */
export function extractAssessmentScoresFromProgress(
  progressItems: LearnWorldsCourseProgress[],
  userId: string,
): LearnWorldsAssessmentScore[] {
  const out: LearnWorldsAssessmentScore[] = [];

  for (const course of progressItems) {
    const raw = asRecordSafe(course.raw);
    const sections = Array.isArray(raw.progress_per_section_unit)
      ? raw.progress_per_section_unit
      : [];

    for (const section of sections) {
      const sectionRow = asRecordSafe(section);
      const units = Array.isArray(sectionRow.units) ? sectionRow.units : [];
      for (const unit of units) {
        const u = asRecordSafe(unit);
        const unitType = String(u.unit_type ?? "");
        if (unitType !== "assessmentV2") continue;

        const scoreRaw = u.score_on_unit;
        if (scoreRaw == null || scoreRaw === "") continue;
        const scorePercent = Number(scoreRaw);
        if (!Number.isFinite(scorePercent)) continue;

        out.push({
          userId,
          assessmentId:
            typeof u.unit_id === "string" || typeof u.unit_id === "number"
              ? String(u.unit_id)
              : null,
          courseId: course.courseId || null,
          title:
            typeof u.unit_name === "string" ? u.unit_name : null,
          scorePercent,
          completedAt: null,
          raw: unit,
        });
      }
    }
  }

  return out;
}

function asRecordSafe(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function getLastActivityDate(
  events: LearnWorldsActivityEvent[],
): string | null {
  const dated = events
    .map((e) => e.occurredAt)
    .filter((d): d is string => Boolean(d))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return dated[0] ?? null;
}

export function calculateInactiveDays(
  lastActivityDate: string | null,
  asOf: Date = new Date(),
): number {
  if (!lastActivityDate) return 0;
  const last = new Date(lastActivityDate).getTime();
  if (Number.isNaN(last)) return 0;
  const diffMs = asOf.getTime() - last;
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}
