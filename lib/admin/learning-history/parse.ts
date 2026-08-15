import type {
  LearningActivityFilter,
  LearningActivityStatus,
  LearningActivityType,
  LearningAssessmentAttempt,
  LearningAssessmentSummary,
  LearningHistoryActivity,
  LearnerLearningHistory,
} from "@/types/learning-history";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function normalizeActivityType(raw: unknown): LearningActivityType {
  const t = String(raw ?? "").trim();
  switch (t) {
    case "video":
    case "youtube":
    case "pdf":
    case "url":
    case "embed":
    case "scorm":
    case "assessmentV2":
    case "newSurvey":
      return t;
    default:
      return "unknown";
  }
}

export function normalizeActivityStatus(raw: unknown): LearningActivityStatus {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === "completed") return "completed";
  if (s === "not_completed") return "not_completed";
  return "unknown";
}

/**
 * Score : null si absent ; 0 réel conservé.
 */
export function parseScoreOnUnit(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = asNumber(raw);
  if (n == null || !Number.isFinite(n)) return null;
  return n;
}

export function activityTypeLabelFr(type: LearningActivityType): string {
  switch (type) {
    case "video":
      return "Vidéo";
    case "youtube":
      return "YouTube";
    case "pdf":
      return "PDF";
    case "url":
      return "Lien";
    case "embed":
      return "Intégré";
    case "scorm":
      return "SCORM";
    case "assessmentV2":
      return "Quiz / examen";
    case "newSurvey":
      return "Sondage";
    default:
      return "Autre";
  }
}

export function activityStatusLabelFr(status: LearningActivityStatus): string {
  switch (status) {
    case "completed":
      return "Terminé";
    case "not_completed":
      return "Non terminé";
    default:
      return "Inconnu";
  }
}

export function formatScorePercent(score: number | null): string {
  if (score == null) return "—";
  return `${Math.round(score)} %`;
}

export function formatDurationSeconds(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem > 0 ? `${m} min ${rem} s` : `${m} min`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min > 0 ? `${h} h ${min} min` : `${h} h`;
}

export function matchesActivityFilter(
  activity: LearningHistoryActivity,
  filter: LearningActivityFilter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "completed":
      return activity.status === "completed";
    case "not_completed":
      return activity.status === "not_completed";
    case "quiz":
      return activity.type === "assessmentV2";
    case "videos":
      return activity.type === "video" || activity.type === "youtube";
    case "documents":
      return activity.type === "pdf";
    case "other":
      return (
        activity.type === "url" ||
        activity.type === "embed" ||
        activity.type === "scorm" ||
        activity.type === "newSurvey" ||
        activity.type === "unknown"
      );
    default:
      return true;
  }
}

/**
 * Parse le payload brut GET /v2/users/{id}/progress (body.data[]).
 */
export function parseLearningHistoryFromProgress(
  learnworldsUserId: string,
  progressItems: unknown[],
): LearnerLearningHistory {
  const activities: LearningHistoryActivity[] = [];
  const assessments: LearningAssessmentSummary[] = [];

  for (const item of progressItems) {
    const course = asRecord(item);
    const courseId = asString(course.course_id);
    const sections = Array.isArray(course.progress_per_section_unit)
      ? course.progress_per_section_unit
      : [];

    for (const section of sections) {
      const sectionRow = asRecord(section);
      const sectionName =
        asString(sectionRow.section_name) ??
        asString(sectionRow.name) ??
        null;
      const units = Array.isArray(sectionRow.units) ? sectionRow.units : [];

      for (const unit of units) {
        const u = asRecord(unit);
        const id = asString(u.unit_id);
        if (!id) continue;

        const type = normalizeActivityType(u.unit_type);
        const status = normalizeActivityStatus(u.unit_status);
        const score = parseScoreOnUnit(u.score_on_unit);
        const name =
          asString(u.unit_name) ??
          asString(u.unit_section_name) ??
          "Activité sans nom";
        const section =
          asString(u.unit_section_name) ?? sectionName;
        const timeOnUnitSeconds = asNumber(u.time_on_unit);

        activities.push({
          id,
          name,
          section,
          courseId,
          type,
          status,
          score,
          timeOnUnitSeconds,
        });

        if (type === "assessmentV2") {
          assessments.push({
            id,
            name,
            section,
            courseId,
            score,
            status,
          });
        }
      }
    }
  }

  const completedCount = activities.filter(
    (a) => a.status === "completed",
  ).length;

  return {
    learnworldsUserId,
    activities,
    assessments,
    completedCount,
    totalCount: activities.length,
  };
}

export function scoredAssessments(
  assessments: LearningAssessmentSummary[],
): LearningAssessmentSummary[] {
  return assessments.filter((a) => a.score != null);
}

export function bestAssessmentScore(
  assessments: LearningAssessmentSummary[],
): number | null {
  const scored = scoredAssessments(assessments);
  if (scored.length === 0) return null;
  return Math.max(...scored.map((a) => a.score as number));
}

/**
 * Parse GET /v2/assessments/{id}/responses?users= body.data[]
 */
export function parseAssessmentAttempts(
  data: unknown[],
): LearningAssessmentAttempt[] {
  return data.map((item) => {
    const row = asRecord(item);
    const submittedRaw = row.submittedTimestamp ?? row.created;
    let submittedAt: string | null = null;
    if (typeof submittedRaw === "number" && Number.isFinite(submittedRaw)) {
      submittedAt = new Date(submittedRaw * 1000).toISOString();
    }

    const passed =
      typeof row.passed === "boolean"
        ? row.passed
        : row.passed == null
          ? null
          : Boolean(row.passed);

    return {
      id: asString(row.id) ?? `attempt-${submittedAt ?? "unknown"}`,
      grade: asNumber(row.grade),
      passed,
      submittedAt,
    };
  });
}

export function summarizeAttempts(attempts: LearningAssessmentAttempt[]): {
  bestGrade: number | null;
  lastGrade: number | null;
  lastSubmittedAt: string | null;
} {
  const withGrade = attempts.filter((a) => a.grade != null);
  if (withGrade.length === 0) {
    return { bestGrade: null, lastGrade: null, lastSubmittedAt: null };
  }
  const bestGrade = Math.max(...withGrade.map((a) => a.grade as number));
  const sorted = [...attempts].sort((a, b) => {
    const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
    const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
    return tb - ta;
  });
  const last = sorted[0]!;
  return {
    bestGrade,
    lastGrade: last.grade,
    lastSubmittedAt: last.submittedAt,
  };
}
