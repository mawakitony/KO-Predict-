import { round0, round1 } from "@/lib/prediction/math";
import type {
  PaceStatus,
  PredictionDataIssue,
  RiskLevel,
} from "@/types/prediction";

/**
 * Plan d’action hebdomadaire V1 — déterministe, dérivé des sorties moteur.
 *
 * Règles documentées :
 * - `targetActivities` = max(1, round0(requiredPace)) si requiredPace > 0
 *   (même arrondi que `generateRecommendedAction`, sans le ×25 questions).
 * - Aucun `targetQuestions` / volume QCM inventé.
 * - Aucune `targetStudyMinutes` inventée.
 * - Les états suivent `paceStatus` + `issues` existants (pas de nouvelles formules).
 */

export type WeeklyPlanStatus =
  | "INSUFFICIENT_DATA"
  | "NO_ACTIVITY"
  | "BEHIND"
  | "SLIGHTLY_BEHIND"
  | "ON_TRACK"
  | "AHEAD"
  | "COMPLETE";

export interface WeeklyPlanInput {
  readinessScore: number | null;
  currentPace: number | null;
  requiredPace: number | null;
  paceStatus: PaceStatus | null;
  remainingActivities: number | null;
  inactiveDays: number | null;
  qcmAverage: number | null;
  riskLevel: RiskLevel | null;
  issues: PredictionDataIssue[];
}

export interface WeeklyPlan {
  status: WeeklyPlanStatus;
  /** Titre d’action principal (impératif court). */
  primaryAction: string;
  /** Explication déterministe. */
  reason: string;
  /** Objectif activités / semaine — null si non calculable. */
  targetActivities: number | null;
  currentPace: number | null;
  requiredPace: number | null;
  inactiveDays: number | null;
  /** Invite qualitative aux QCM — jamais un nombre de questions. */
  emphasizeQcm: boolean;
}

const INSUFFICIENT_ISSUES: ReadonlySet<PredictionDataIssue> = new Set([
  "INSUFFICIENT_QCM",
  "INSUFFICIENT_ACTIVITY_FOR_PACE",
  "MISSING_TARGET_DATE",
  "INCOMPLETE_METRICS",
  "TARGET_DATE_PASSED",
]);

/** Objectif hebdo d’activités à partir du rythme requis moteur. */
export function resolveWeeklyTargetActivities(
  requiredPace: number | null | undefined,
): number | null {
  if (requiredPace == null || !(requiredPace > 0)) return null;
  return Math.max(1, round0(requiredPace));
}

function hasIssue(
  issues: PredictionDataIssue[],
  code: PredictionDataIssue,
): boolean {
  return issues.includes(code);
}

function formatPace(value: number): string {
  return Number.isInteger(value) ? String(value) : String(round1(value));
}

/**
 * Construit le plan de la semaine à partir des données déjà disponibles.
 * Ne modifie aucune formule de prédiction.
 */
export function buildWeeklyPlan(input: WeeklyPlanInput): WeeklyPlan {
  const {
    readinessScore,
    currentPace,
    requiredPace,
    paceStatus,
    remainingActivities,
    inactiveDays,
    qcmAverage,
    issues,
  } = input;

  const targetActivities = resolveWeeklyTargetActivities(requiredPace);
  const emphasizeQcm =
    qcmAverage == null || hasIssue(issues, "INSUFFICIENT_QCM");

  const base = {
    targetActivities,
    currentPace,
    requiredPace,
    inactiveDays,
    emphasizeQcm,
  };

  // Contenu terminé côté activités.
  if (
    remainingActivities === 0 ||
    hasIssue(issues, "NO_REMAINING_WORK")
  ) {
    return {
      ...base,
      status: "COMPLETE",
      primaryAction: "Passez en révision finale",
      reason:
        "Le parcours d’activités semble terminé. Concentrez-vous sur la révision et les examens blancs.",
      targetActivities: null,
    };
  }

  // Inactivité réelle (0 ≠ null).
  if (
    paceStatus === "NO_ACTIVITY" ||
    hasIssue(issues, "ZERO_CURRENT_PACE") ||
    currentPace === 0
  ) {
    const days =
      inactiveDays != null && inactiveDays >= 0 ? inactiveDays : null;
    return {
      ...base,
      status: "NO_ACTIVITY",
      primaryAction: "Reprenez votre préparation cette semaine",
      reason:
        days != null
          ? `Dernière activité : il y a ${days} jour${days > 1 ? "s" : ""}. Une reprise régulière réactive votre trajectoire.`
          : "Aucune activité récente détectée. Une reprise régulière réactive votre trajectoire.",
    };
  }

  // Données insuffisantes pour un objectif chiffré fiable.
  const blockedByIssues = issues.some((i) => INSUFFICIENT_ISSUES.has(i));
  const noPaceTarget =
    targetActivities == null &&
    (paceStatus == null || readinessScore == null);

  if (blockedByIssues || noPaceTarget) {
    return {
      ...base,
      status: "INSUFFICIENT_DATA",
      primaryAction: "Continuez votre progression cette semaine",
      reason: emphasizeQcm
        ? "Réalisez des activités et des QCM afin que KO Predict™ puisse établir une première trajectoire fiable."
        : "Continuez votre progression afin que KO Predict™ puisse affiner votre trajectoire.",
      targetActivities: null,
    };
  }

  if (paceStatus === "BEHIND") {
    return {
      ...base,
      status: "BEHIND",
      primaryAction: "Accélérez votre progression",
      reason:
        currentPace != null && requiredPace != null
          ? `Votre rythme (${formatPace(currentPace)} / semaine) est inférieur au rythme nécessaire (${formatPace(requiredPace)} / semaine).`
          : "Votre rythme est inférieur au rythme nécessaire pour l’échéance.",
    };
  }

  if (paceStatus === "SLIGHTLY_BEHIND") {
    return {
      ...base,
      status: "SLIGHTLY_BEHIND",
      primaryAction: "Augmentez légèrement votre rythme",
      reason:
        currentPace != null && requiredPace != null
          ? `Vous êtes un peu en dessous du rythme cible (${formatPace(currentPace)} vs ${formatPace(requiredPace)} / semaine).`
          : "Un léger coup d’accélérateur cette semaine stabilise votre trajectoire.",
    };
  }

  if (paceStatus === "AHEAD") {
    return {
      ...base,
      status: "AHEAD",
      primaryAction: "Maintenez votre avance",
      reason:
        currentPace != null && requiredPace != null
          ? `Vous êtes au-dessus du rythme nécessaire (${formatPace(currentPace)} vs ${formatPace(requiredPace)} / semaine).`
          : "Votre rythme actuel vous place en avance sur la trajectoire.",
    };
  }

  // ON_TRACK (ou fallback si paceStatus null mais target connu).
  return {
    ...base,
    status: "ON_TRACK",
    primaryAction: "Maintenez votre rythme actuel",
    reason:
      currentPace != null && requiredPace != null
        ? `Vous êtes aligné sur le rythme nécessaire (${formatPace(currentPace)} vs ${formatPace(requiredPace)} / semaine).`
        : "Poursuivez au même rythme pour conserver une trajectoire stable.",
  };
}
