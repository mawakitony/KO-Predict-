import type { LearnWorldsCourse } from "@/types/learnworlds";

export const NO_ACTIVE_FORMATION = "Aucune formation active";
export const UNKNOWN_FORMATION_TITLE = "Formation sans intitulé";

export type LearnerFormationCourse = {
  courseId: string;
  title: string;
  titleResolved: boolean;
};

export type LearnerFormationView = {
  courses: LearnerFormationCourse[];
  /** Ligne compacte (carte / header). */
  compactLabel: string;
  /** Sous-titre header : titre réel unique, sinon null → « Dossier apprenant ». */
  headerTitle: string | null;
};

export function emptyLearnerFormation(): LearnerFormationView {
  return {
    courses: [],
    compactLabel: NO_ACTIVE_FORMATION,
    headerTitle: null,
  };
}

export function courseIdsFromProgress(progressItems: unknown[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  if (!Array.isArray(progressItems)) return ids;
  for (const item of progressItems) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const id = raw.course_id ?? raw.courseId;
    if (typeof id !== "string") continue;
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    ids.push(trimmed);
  }
  return ids;
}

export function catalogTitleById(
  courses: readonly LearnWorldsCourse[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const course of courses) {
    const id = course.id?.trim();
    const title = course.title?.trim();
    if (!id || !title) continue;
    map.set(id, title);
  }
  return map;
}

/**
 * Présentation fiche admin.
 * Ne lit jamais la colonne certification persistée, ni un défaut PMP.
 */
export function buildLearnerFormationView(
  progressItems: unknown[],
  catalog: readonly LearnWorldsCourse[],
): LearnerFormationView {
  const ids = courseIdsFromProgress(progressItems);
  if (ids.length === 0) return emptyLearnerFormation();

  const titles = catalogTitleById(catalog);
  const courses: LearnerFormationCourse[] = ids.map((courseId) => {
    const resolved = titles.get(courseId);
    if (resolved) {
      return { courseId, title: resolved, titleResolved: true };
    }
    return {
      courseId,
      title: UNKNOWN_FORMATION_TITLE,
      titleResolved: false,
    };
  });

  if (courses.length === 1) {
    const only = courses[0];
    return {
      courses,
      compactLabel: only.title,
      headerTitle: only.titleResolved ? only.title : null,
    };
  }

  const extra = courses.length - 1;
  return {
    courses,
    compactLabel: `${courses[0].title} +${extra} autre${extra > 1 ? "s" : ""}`,
    headerTitle: null,
  };
}

export function formationNeverUsesCertificationFallback(
  view: LearnerFormationView,
  certification: string | null | undefined,
): boolean {
  if (!certification?.trim()) return true;
  const haystack = [
    view.compactLabel,
    view.headerTitle ?? "",
    ...view.courses.map((c) => c.title),
  ].join("\n");
  return !haystack.includes(certification.trim());
}
