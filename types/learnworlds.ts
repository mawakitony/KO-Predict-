/**
 * Types LearnWorlds — formes attendues côté KO Predict™.
 * Les chemins d'API concrets seront branchés en phase 10
 * après confirmation sur https://www.learnworlds.dev/
 */

/** Data key LearnWorlds API live pour « Target date of the exam ». */
export const LEARNWORLDS_TARGET_EXAM_FIELD_KEY = "cf_ko_target_exam_date";

/**
 * @deprecated Alias historique sans préfixe cf_ — fallback uniquement.
 * Préférer LEARNWORLDS_TARGET_EXAM_FIELD_KEY.
 */
export const LW_CUSTOM_FIELD_TARGET_EXAM_DATE = "ko_target_exam_date";

export interface LearnWorldsAuthToken {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  obtainedAt: string; // ISO
}

export interface LearnWorldsUser {
  id: string;
  email: string | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  /** Tags LearnWorlds (ex. formation CAPM). */
  tags: string[];
  /** Champs personnalisés (ex. cf_ko_target_exam_date). */
  customFields: Record<string, string | number | boolean | null>;
  createdAt: string | null;
  lastLoginAt: string | null;
  raw?: unknown;
}

export interface LearnWorldsCourse {
  id: string;
  title: string | null;
  raw?: unknown;
}

export interface LearnWorldsEnrollment {
  userId: string;
  courseId: string;
  enrolledAt: string | null;
  raw?: unknown;
}

export interface LearnWorldsCourseProgress {
  userId: string;
  courseId: string;
  /** 0–100 si fourni par LearnWorlds. */
  progressPercent: number | null;
  completedActivities: number | null;
  totalActivities: number | null;
  studyTimeMinutes: number | null;
  status: string | null;
  raw?: unknown;
}

export interface LearnWorldsAssessmentScore {
  userId: string;
  assessmentId: string | null;
  courseId: string | null;
  title: string | null;
  scorePercent: number | null;
  completedAt: string | null;
  raw?: unknown;
}

export interface LearnWorldsActivityEvent {
  userId: string;
  occurredAt: string | null;
  activityType: string | null;
  courseId: string | null;
  unitId: string | null;
  raw?: unknown;
}

/** Agrégat normalisé pour alimenter learning_metrics / students. */
export interface LearnWorldsNormalizedLearnerSnapshot {
  learnworldsUserId: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  /** YYYY-MM-DD issu de cf_ko_target_exam_date si parseable. */
  targetExamDate: string | null;
  progressPercent: number | null;
  completedActivities: number | null;
  totalActivities: number | null;
  studyTimeMinutes: number | null;
  qcmAverage: number | null;
  recentQcmAverage: number | null;
  lastActivityDate: string | null;
  courses: LearnWorldsCourse[];
}
