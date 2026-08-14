/** Jours de révision finale après achèvement du contenu (configurable). */
export const FINAL_REVIEW_DAYS = 7;

/** Pondérations du Readiness Score V1 (estimation interne, non scientifique). */
export const READINESS_WEIGHTS = {
  progress: 0.3,
  qcm: 0.3,
  consistency: 0.2,
  pace: 0.2,
} as const;

export const RISK_THRESHOLDS = {
  greenMin: 80,
  amberMin: 60,
  criticalInactiveDays: 7,
} as const;
