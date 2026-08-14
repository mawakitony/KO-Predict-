import { RISK_SORT_ORDER, type AdminStudentRow } from "@/lib/admin/types";
import type { RiskLevel } from "@/types/prediction";

export type ProgressBucketKey = "0-24" | "25-49" | "50-74" | "75-100";

export interface SchoolOverviewAlert {
  studentId: string;
  fullName: string;
  certification: string;
  riskLevel: RiskLevel;
  readinessProbability: number | null;
  progressPercent: number | null;
  inactiveDays: number;
  reason: string;
}

export interface SchoolOverviewStats {
  totalStudents: number;
  withEstimation: number;
  collectingData: number;
  /** Moyenne readinessScore — null si aucune estimation. */
  avgReadinessScore: number | null;
  /** Moyenne readinessProbability — null si aucune. */
  avgSuccessProbability: number | null;
  /** Moyenne progression — null si aucune valeur. */
  avgProgressPercent: number | null;
  onTrackCount: number;
  behindCount: number;
  inactive7dCount: number;
  riskCounts: Record<RiskLevel | "NONE", number>;
  /** Part des apprenants GREEN parmi ceux évalués (null si aucun). */
  globalSuccessRate: number | null;
  alertCount: number;
  alerts: SchoolOverviewAlert[];
  progressBuckets: Record<ProgressBucketKey, number>;
  byCertification: Array<{
    certification: string;
    count: number;
    avgProbability: number | null;
  }>;
  /** Profil de progression (courbe) — buckets ordonnés. */
  progressProfile: SchoolChartPoint[];
  /** Courbe cohort : apprenants triés par progression → readiness. */
  cohortCurve: SchoolChartPoint[];
  /** Sparklines KPI (valeurs 0–100). */
  sparkSuccess: number[];
  sparkReadiness: number[];
  sparkProgress: number[];
}

export interface SchoolChartPoint {
  label: string;
  value: number;
}

export interface SchoolTrendPoint {
  label: string;
  avgReadiness: number | null;
  avgProgress: number | null;
  avgProbability: number | null;
  sampleSize: number;
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function progressBucket(progress: number | null): ProgressBucketKey | null {
  if (progress == null || Number.isNaN(progress)) return null;
  if (progress < 25) return "0-24";
  if (progress < 50) return "25-49";
  if (progress < 75) return "50-74";
  return "75-100";
}

function interventionRows(rows: AdminStudentRow[]): AdminStudentRow[] {
  return rows
    .filter(
      (r) =>
        r.prediction.riskLevel === "CRITICAL" ||
        r.prediction.riskLevel === "RED" ||
        r.prediction.riskLevel === "AMBER",
    )
    .sort((a, b) => {
      const ra = a.prediction.riskLevel
        ? RISK_SORT_ORDER[a.prediction.riskLevel]
        : 99;
      const rb = b.prediction.riskLevel
        ? RISK_SORT_ORDER[b.prediction.riskLevel]
        : 99;
      return ra - rb;
    });
}

/** Message pédagogique — pourquoi alerter l’apprenant pour réviser. */
export function schoolAlertReason(row: AdminStudentRow): string {
  const risk = row.prediction.riskLevel;
  const inactive = row.metrics.inactiveDays;
  const pace = row.prediction.paceStatus;

  if (risk === "CRITICAL") {
    if (inactive >= 7) {
      return "Alerte urgente : inactif depuis plusieurs jours — relancer pour reprendre la révision.";
    }
    return "Alerte urgente : trajectoire critique — contacter pour intensifier la révision.";
  }
  if (risk === "RED") {
    if (pace === "BEHIND" || pace === "NO_ACTIVITY") {
      return "Risque élevé : rythme insuffisant — encourager une reprise régulière des QCM.";
    }
    return "Risque élevé : prévenir l’apprenant pour renforcer sa révision avant l’examen.";
  }
  if (risk === "AMBER") {
    if (inactive >= 3) {
      return "À surveiller : activité en baisse — rappeler de maintenir le rythme de révision.";
    }
    return "À surveiller : encourager une révision ciblée pour sécuriser la trajectoire.";
  }
  return "À accompagner dans la préparation.";
}

/**
 * Agrégats école depuis les lignes admin déjà chargées.
 * Aucune nouvelle formule moteur — lecture / agrégation pure.
 */
export function computeSchoolOverview(
  rows: AdminStudentRow[],
): SchoolOverviewStats {
  const interventions = interventionRows(rows);

  const readinessScores = rows
    .map((r) => r.prediction.readinessScore)
    .filter((v): v is number => v != null && !Number.isNaN(v));
  const probabilities = rows
    .map((r) => r.prediction.readinessProbability)
    .filter((v): v is number => v != null && !Number.isNaN(v));
  const progresses = rows
    .map((r) => r.prediction.progressPercent ?? r.metrics.progressPercent)
    .filter((v): v is number => v != null && !Number.isNaN(v));

  const riskCounts: Record<RiskLevel | "NONE", number> = {
    GREEN: 0,
    AMBER: 0,
    RED: 0,
    CRITICAL: 0,
    NONE: 0,
  };

  let onTrackCount = 0;
  let behindCount = 0;
  let inactive7dCount = 0;
  let collectingData = 0;

  const progressBuckets: Record<ProgressBucketKey, number> = {
    "0-24": 0,
    "25-49": 0,
    "50-74": 0,
    "75-100": 0,
  };

  const certMap = new Map<string, { count: number; probs: number[] }>();

  for (const row of rows) {
    const risk = row.prediction.riskLevel;
    if (risk) riskCounts[risk] += 1;
    else riskCounts.NONE += 1;

    if (row.prediction.readinessScore == null) collectingData += 1;

    const pace = row.prediction.paceStatus;
    if (pace === "ON_TRACK" || pace === "AHEAD") onTrackCount += 1;
    if (
      pace === "BEHIND" ||
      pace === "SLIGHTLY_BEHIND" ||
      pace === "NO_ACTIVITY"
    ) {
      behindCount += 1;
    }

    if (row.metrics.inactiveDays >= 7) inactive7dCount += 1;

    const bucket = progressBucket(
      row.prediction.progressPercent ?? row.metrics.progressPercent,
    );
    if (bucket) progressBuckets[bucket] += 1;

    const cert = row.student.certification || "Autre";
    const entry = certMap.get(cert) ?? { count: 0, probs: [] };
    entry.count += 1;
    if (
      row.prediction.readinessProbability != null &&
      !Number.isNaN(row.prediction.readinessProbability)
    ) {
      entry.probs.push(row.prediction.readinessProbability);
    }
    certMap.set(cert, entry);
  }

  const evaluated =
    riskCounts.GREEN + riskCounts.AMBER + riskCounts.RED + riskCounts.CRITICAL;
  const globalSuccessRate =
    evaluated > 0 ? (riskCounts.GREEN / evaluated) * 100 : null;

  const alerts: SchoolOverviewAlert[] = interventions.map((row) => ({
    studentId: row.student.studentId,
    fullName: row.student.fullName,
    certification: row.student.certification,
    riskLevel: row.prediction.riskLevel as RiskLevel,
    readinessProbability: row.prediction.readinessProbability,
    progressPercent:
      row.prediction.progressPercent ?? row.metrics.progressPercent,
    inactiveDays: row.metrics.inactiveDays,
    reason: schoolAlertReason(row),
  }));

  const byCertification = [...certMap.entries()]
    .map(([certification, data]) => ({
      certification,
      count: data.count,
      avgProbability: mean(data.probs),
    }))
    .sort((a, b) => b.count - a.count);

  const progressProfile: SchoolChartPoint[] = (
    ["0-24", "25-49", "50-74", "75-100"] as ProgressBucketKey[]
  ).map((key) => ({
    label: key,
    value: progressBuckets[key],
  }));

  const cohortCurve: SchoolChartPoint[] = rows
    .map((r) => ({
      progress: r.prediction.progressPercent ?? r.metrics.progressPercent ?? 0,
      readiness: r.prediction.readinessScore,
      name: r.student.fullName,
    }))
    .filter((r) => r.readiness != null)
    .sort((a, b) => a.progress - b.progress)
    .map((r, i) => ({
      label: r.name || `A${i + 1}`,
      value: r.readiness as number,
    }));

  /** Sparklines dérivées du profil / cohort (visuel, pas une nouvelle formule). */
  const sparkProgress = progressProfile.map((p) =>
    rows.length > 0 ? (p.value / rows.length) * 100 : 0,
  );
  const sparkReadiness =
    cohortCurve.length > 0
      ? cohortCurve.map((p) => p.value)
      : [0];
  const sparkSuccess = [
    riskCounts.GREEN,
    riskCounts.AMBER,
    riskCounts.RED,
    riskCounts.CRITICAL,
    riskCounts.NONE,
  ].map((c) => (rows.length > 0 ? (c / rows.length) * 100 : 0));

  return {
    totalStudents: rows.length,
    withEstimation: readinessScores.length,
    collectingData,
    avgReadinessScore: mean(readinessScores),
    avgSuccessProbability: mean(probabilities),
    avgProgressPercent: mean(progresses),
    onTrackCount,
    behindCount,
    inactive7dCount,
    riskCounts,
    globalSuccessRate,
    alertCount: alerts.length,
    alerts,
    progressBuckets,
    byCertification,
    progressProfile,
    cohortCurve,
    sparkSuccess,
    sparkReadiness,
    sparkProgress,
  };
}

/**
 * Agrège l'historique brut en points journaliers (moyennes).
 * null ≠ 0 : une journée sans valeur reste null côté série.
 */
export function aggregateSchoolTrends(
  rows: Array<{
    createdAt: string;
    readinessScore: number | null;
    readinessProbability: number | null;
    progressPercent: number | null;
  }>,
): SchoolTrendPoint[] {
  const byDay = new Map<
    string,
    {
      readiness: number[];
      progress: number[];
      probability: number[];
    }
  >();

  for (const row of rows) {
    const day = row.createdAt.slice(0, 10);
    if (!day) continue;
    const bucket = byDay.get(day) ?? {
      readiness: [],
      progress: [],
      probability: [],
    };
    if (row.readinessScore != null && !Number.isNaN(row.readinessScore)) {
      bucket.readiness.push(row.readinessScore);
    }
    if (row.progressPercent != null && !Number.isNaN(row.progressPercent)) {
      bucket.progress.push(row.progressPercent);
    }
    if (
      row.readinessProbability != null &&
      !Number.isNaN(row.readinessProbability)
    ) {
      bucket.probability.push(row.readinessProbability);
    }
    byDay.set(day, bucket);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([isoDay, data]) => {
      const [, month, dayNum] = isoDay.split("-");
      return {
        label: `${dayNum}/${month}`,
        avgReadiness: mean(data.readiness),
        avgProgress: mean(data.progress),
        avgProbability: mean(data.probability),
        sampleSize:
          data.readiness.length ||
          data.progress.length ||
          data.probability.length,
      };
    });
}
