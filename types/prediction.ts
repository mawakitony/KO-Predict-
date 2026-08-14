export type RiskLevel = "GREEN" | "AMBER" | "RED" | "CRITICAL";

export type PaceStatus =
  | "ON_TRACK"
  | "SLIGHTLY_BEHIND"
  | "BEHIND"
  | "AHEAD"
  | "NO_ACTIVITY";

export type PredictionDataIssue =
  | "MISSING_TARGET_DATE"
  | "INSUFFICIENT_QCM"
  | "INSUFFICIENT_ACTIVITY_FOR_PACE"
  | "NO_REMAINING_WORK"
  | "TARGET_DATE_PASSED"
  | "ZERO_CURRENT_PACE"
  | "INCOMPLETE_METRICS";

export interface PredictionInput {
  completedActivities: number;
  totalActivities: number;
  /** Si fourni et fiable (ex. LearnWorlds), utiliséé à la place du ratio activités. */
  progressPercent?: number | null;
  qcmAverage: number | null;
  recentQcmAverage?: number | null;
  inactiveDays: number;
  targetExamDate: string | null; // YYYY-MM-DD
  /**
   * Rythme actuel (activités / semaine).
   * V1 : fourni en entrée (seed / fenêtre 7j) tant que l'historique détaillé n'existe pas.
   */
  currentPace?: number | null;
  /** Date de référence des calculs (UTC). Défaut : maintenant. */
  asOf?: Date;
  /** Jours de révision finale après fin de contenu. */
  finalReviewDays?: number;
}

export interface PredictionResult {
  progressPercent: number | null;
  remainingActivities: number | null;
  currentPace: number | null;
  requiredPace: number | null;
  readinessScore: number | null;
  readinessProbability: number | null;
  predictedCompletionDate: string | null; // YYYY-MM-DD
  predictedReadinessDate: string | null;
  riskLevel: RiskLevel | null;
  paceStatus: PaceStatus | null;
  recommendedAction: string | null;
  issues: PredictionDataIssue[];
  calculatedAt: string; // ISO
}

export interface Prediction {
  id: string;
  studentId: string;
  currentPace: number | null;
  requiredPace: number | null;
  remainingActivities: number | null;
  readinessScore: number | null;
  readinessProbability: number | null;
  predictedCompletionDate: string | null;
  predictedReadinessDate: string | null;
  riskLevel: RiskLevel | null;
  recommendedAction: string | null;
  paceStatus: PaceStatus | null;
  calculatedAt: string;
}

export interface PredictionHistory {
  id: string;
  studentId: string;
  progressPercent: number | null;
  qcmAverage: number | null;
  currentPace: number | null;
  requiredPace: number | null;
  readinessScore: number | null;
  readinessProbability: number | null;
  predictedCompletionDate: string | null;
  predictedReadinessDate: string | null;
  riskLevel: RiskLevel | null;
  createdAt: string;
}
