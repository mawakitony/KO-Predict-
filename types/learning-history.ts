/**
 * Types historique pédagogique LearnWorlds (V1 coaching — lecture seule).
 */

export type LearningActivityStatus = "completed" | "not_completed" | "unknown";

export type LearningActivityType =
  | "video"
  | "youtube"
  | "pdf"
  | "url"
  | "embed"
  | "scorm"
  | "assessmentV2"
  | "newSurvey"
  | "unknown";

export interface LearningHistoryActivity {
  id: string;
  name: string;
  section: string | null;
  courseId: string | null;
  type: LearningActivityType;
  status: LearningActivityStatus;
  /** Score % si réel (null ≠ 0). */
  score: number | null;
  /** Temps passé sur l’unité, en secondes (null si absent). */
  timeOnUnitSeconds: number | null;
}

export interface LearningAssessmentSummary {
  id: string;
  name: string;
  section: string | null;
  courseId: string | null;
  /** Score % depuis progress (null ≠ 0). */
  score: number | null;
  status: LearningActivityStatus;
}

export interface LearningAssessmentAttempt {
  id: string;
  grade: number | null;
  passed: boolean | null;
  /** ISO depuis submittedTimestamp. */
  submittedAt: string | null;
}

export interface LearningHistoryQuizSummary {
  scoredCount: number;
  bestScore: number | null;
  /** Depuis learning_metrics — fourni par la page, pas recalculé ici. */
  qcmAverage: number | null;
  recentQcmAverage: number | null;
}

export interface LearnerLearningHistory {
  learnworldsUserId: string;
  activities: LearningHistoryActivity[];
  assessments: LearningAssessmentSummary[];
  completedCount: number;
  totalCount: number;
}

export type LearningActivityFilter =
  | "all"
  | "completed"
  | "not_completed"
  | "quiz"
  | "videos"
  | "documents"
  | "other";
