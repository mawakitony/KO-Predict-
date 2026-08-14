/**
 * Helpers purs pour le cron sync LearnWorlds (testables sans I/O).
 */

export const LW_SYNC_CONCURRENCY = 1;
/** Pause entre apprenants pour rester sous ~30 req / 10 s. */
export const LW_SYNC_DELAY_MS = 400;
/** Limite de sécurité par run (Hobby ~60s). */
export const LW_SYNC_MAX_STUDENTS = 100;

export interface SyncableStudentRow {
  studentId: string;
  learnworldsUserId: string;
  email: string | null;
  accountStatus: string;
  role: string;
}

export function isSyncableActiveStudent(row: {
  accountStatus: string | null | undefined;
  role: string | null | undefined;
  learnworldsUserId: string | null | undefined;
}): boolean {
  return (
    row.accountStatus === "ACTIVE" &&
    row.role === "student" &&
    Boolean(row.learnworldsUserId?.trim())
  );
}

export function filterSyncableStudents<T extends {
  accountStatus: string | null | undefined;
  role: string | null | undefined;
  learnworldsUserId: string | null | undefined;
}>(rows: T[]): T[] {
  return rows.filter(isSyncableActiveStudent);
}

export interface MetricsFingerprint {
  progressPercent: number | null;
  completedActivities: number;
  totalActivities: number;
  studyTimeMinutes: number;
  qcmAverage: number | null;
  recentQcmAverage: number | null;
}

export interface PredictionFingerprint {
  readinessScore: number | null;
  readinessProbability: number | null;
  riskLevel: string | null;
  currentPace: number | null;
  requiredPace: number | null;
  predictedCompletionDate: string | null;
  predictedReadinessDate: string | null;
}

function nearlyEqual(
  a: number | null | undefined,
  b: number | null | undefined,
  eps = 0.05,
): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(Number(a) - Number(b)) <= eps;
}

export function metricsFingerprintsEqual(
  a: MetricsFingerprint,
  b: MetricsFingerprint,
): boolean {
  return (
    nearlyEqual(a.progressPercent, b.progressPercent) &&
    a.completedActivities === b.completedActivities &&
    a.totalActivities === b.totalActivities &&
    a.studyTimeMinutes === b.studyTimeMinutes &&
    nearlyEqual(a.qcmAverage, b.qcmAverage) &&
    nearlyEqual(a.recentQcmAverage, b.recentQcmAverage)
  );
}

export function predictionFingerprintsEqual(
  a: PredictionFingerprint,
  b: PredictionFingerprint,
): boolean {
  return (
    nearlyEqual(a.readinessScore, b.readinessScore) &&
    nearlyEqual(a.readinessProbability, b.readinessProbability) &&
    (a.riskLevel ?? null) === (b.riskLevel ?? null) &&
    nearlyEqual(a.currentPace, b.currentPace) &&
    nearlyEqual(a.requiredPace, b.requiredPace) &&
    (a.predictedCompletionDate ?? null) ===
      (b.predictedCompletionDate ?? null) &&
    (a.predictedReadinessDate ?? null) === (b.predictedReadinessDate ?? null)
  );
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
