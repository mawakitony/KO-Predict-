import { READINESS_WEIGHTS } from "@/lib/prediction/constants";
import { clamp, round0, round1 } from "@/lib/prediction/math";
import { calculatePaceScore } from "@/lib/prediction/pace";
import {
  calculateConsistencyScore,
  calculateQcmScore,
} from "@/lib/prediction/readiness";
import { ISSUE_LEARNER_MESSAGES } from "@/lib/dashboard/learner-presentation";
import type { PredictionDataIssue } from "@/types/prediction";

/**
 * Explication déterministe du Readiness Score.
 * Miroir de `calculateReadinessScore` — ne modifie aucune pondération.
 *
 * Contributions (avec rythme calculable) :
 *   points = factorScore × weight
 *   readiness ≈ round0(sum(points))
 *
 * Sans rythme calculable : le poids pace est redistribué sur
 * progress + qcm + consistency (somme 0.8) — même règle que le moteur.
 */

export const READINESS_DISCLAIMER =
  "KO Predict™ utilise des règles de calcul basées sur votre progression, vos performances et votre rythme. Cette estimation n’est pas une garantie de réussite à l’examen.";

export type ReadinessFactorKey =
  | "progress"
  | "qcm"
  | "consistency"
  | "pace";

export interface ReadinessFactorBreakdown {
  key: ReadinessFactorKey;
  label: string;
  /** Pondération affichée (% du total utilisé pour ce calcul). */
  weightPercent: number;
  /** Sous-score 0–100, ou null si non calculable (null ≠ 0). */
  factorScore: number | null;
  /** Points vers le readiness avant arrondi (factorScore × poids effectif). */
  contributionPoints: number | null;
  /** Détail factuel (valeurs sources), sans causalité scientifique. */
  detail: string;
  /** Facteur exclu du calcul (ex. rythme redistribué). */
  excluded: boolean;
}

export interface ReadinessExplanationInput {
  readinessScore: number | null;
  progressPercent: number | null;
  qcmAverage: number | null;
  recentQcmAverage?: number | null;
  inactiveDays: number;
  currentPace: number | null;
  requiredPace: number | null;
  issues: PredictionDataIssue[];
}

export interface ReadinessExplanation {
  mode: "available" | "unavailable";
  readinessScore: number | null;
  /** Score recomputé avant affichage (contrôle cohérence). */
  recomputedScore: number | null;
  paceRedistributed: boolean;
  factors: ReadinessFactorBreakdown[];
  helps: string[];
  improve: string[];
  issueMessages: string[];
  unavailableReasons: string[];
  disclaimer: string;
}

function formatScore(value: number): string {
  return Number.isInteger(value) ? String(value) : String(round1(value));
}

function buildUnavailableReasons(options: {
  progressScore: number | null;
  qcmScore: number | null;
  issues: PredictionDataIssue[];
}): string[] {
  const reasons: string[] = [];
  if (options.progressScore == null) {
    reasons.push(
      "La progression n’est pas encore disponible : sans elle, KO Predict™ ne calcule pas de score de préparation.",
    );
  }
  if (options.qcmScore == null) {
    reasons.push(
      "Aucun résultat QCM exploitable n’est encore disponible (une moyenne à 0 compterait ; l’absence de donnée, non).",
    );
  }

  const seen = new Set<string>();
  for (const issue of options.issues) {
    const msg = ISSUE_LEARNER_MESSAGES[issue];
    if (msg && !seen.has(msg)) {
      seen.add(msg);
      reasons.push(msg);
    }
  }

  if (reasons.length === 0) {
    reasons.push(
      "Certaines données nécessaires à l’estimation ne sont pas encore disponibles.",
    );
  }
  return reasons;
}

function buildHelpsImprove(options: {
  progressScore: number | null;
  qcmScore: number | null;
  consistencyScore: number;
  paceScore: number | null;
  currentPace: number | null;
  requiredPace: number | null;
  inactiveDays: number;
}): { helps: string[]; improve: string[] } {
  const helps: string[] = [];
  const improve: string[] = [];

  if (options.progressScore != null) {
    if (options.progressScore >= 70) {
      helps.push("Votre progression continue à un bon niveau.");
    } else if (options.progressScore < 50) {
      improve.push("Votre progression reste limitée par rapport au parcours.");
    }
  }

  if (options.qcmScore != null) {
    if (options.qcmScore >= 70) {
      helps.push("Vos résultats QCM sont solides.");
    } else if (options.qcmScore < 60) {
      improve.push("Vos performances QCM peuvent encore progresser.");
    }
  }

  if (options.consistencyScore >= 80) {
    helps.push("Votre régularité d’étude est bonne.");
  } else if (options.consistencyScore < 50) {
    improve.push(
      options.inactiveDays >= 7
        ? `Votre régularité faiblit (${options.inactiveDays} jours sans activité).`
        : "Votre régularité d’étude peut être renforcée.",
    );
  }

  if (options.currentPace === 0) {
    improve.push("Votre rythme actuel est à 0 activité / semaine.");
  } else if (options.paceScore != null) {
    if (options.paceScore >= 95) {
      helps.push("Votre rythme est aligné sur le rythme nécessaire.");
    } else if (options.paceScore < 75) {
      improve.push(
        options.currentPace != null && options.requiredPace != null
          ? `Votre rythme (${formatScore(options.currentPace)} / semaine) est inférieur au rythme nécessaire (${formatScore(options.requiredPace)} / semaine).`
          : "Votre rythme est inférieur au rythme nécessaire.",
      );
    }
  }

  return { helps, improve };
}

/**
 * Construit l’explication du readiness à partir des mêmes entrées que le moteur.
 */
export function buildReadinessExplanation(
  input: ReadinessExplanationInput,
): ReadinessExplanation {
  const {
    readinessScore,
    progressPercent,
    qcmAverage,
    recentQcmAverage = null,
    inactiveDays,
    currentPace,
    requiredPace,
    issues,
  } = input;

  const progressScore =
    progressPercent == null ? null : clamp(progressPercent, 0, 100);
  const qcmScore = calculateQcmScore(qcmAverage, recentQcmAverage);
  const consistencyScore = calculateConsistencyScore(inactiveDays);
  const paceScore = calculatePaceScore(currentPace, requiredPace);

  const issueMessages = issues
    .map((i) => ISSUE_LEARNER_MESSAGES[i])
    .filter((m, idx, arr): m is string => Boolean(m) && arr.indexOf(m) === idx);

  // Mode indisponible : readiness null (garde moteur : progress ou qcm manquant).
  if (readinessScore == null || progressScore == null || qcmScore == null) {
    return {
      mode: "unavailable",
      readinessScore: null,
      recomputedScore: null,
      paceRedistributed: false,
      factors: [],
      helps: [],
      improve: [],
      issueMessages,
      unavailableReasons: buildUnavailableReasons({
        progressScore,
        qcmScore,
        issues,
      }),
      disclaimer: READINESS_DISCLAIMER,
    };
  }

  const paceRedistributed = paceScore == null;
  const weightSum = paceRedistributed
    ? READINESS_WEIGHTS.progress +
      READINESS_WEIGHTS.qcm +
      READINESS_WEIGHTS.consistency
    : 1;

  const effective = {
    progress: READINESS_WEIGHTS.progress / weightSum,
    qcm: READINESS_WEIGHTS.qcm / weightSum,
    consistency: READINESS_WEIGHTS.consistency / weightSum,
    pace: paceRedistributed ? 0 : READINESS_WEIGHTS.pace / weightSum,
  };

  const contribution = {
    progress: progressScore * effective.progress,
    qcm: qcmScore * effective.qcm,
    consistency: consistencyScore * effective.consistency,
    pace: paceRedistributed || paceScore == null ? null : paceScore * effective.pace,
  };

  const recomputed =
    contribution.progress +
    contribution.qcm +
    contribution.consistency +
    (contribution.pace ?? 0);

  const factors: ReadinessFactorBreakdown[] = [
    {
      key: "progress",
      label: "Progression",
      weightPercent: round1(effective.progress * 100),
      factorScore: progressScore,
      contributionPoints: round1(contribution.progress),
      detail: `Progression mesurée : ${formatScore(progressScore)} %.`,
      excluded: false,
    },
    {
      key: "qcm",
      label: "Performance QCM",
      weightPercent: round1(effective.qcm * 100),
      factorScore: round1(qcmScore),
      contributionPoints: round1(contribution.qcm),
      detail:
        qcmAverage != null && recentQcmAverage != null
          ? `QCM global ${formatScore(qcmAverage)} % · récent ${formatScore(recentQcmAverage)} % (combinaison 60/40).`
          : qcmAverage != null
            ? `Moyenne QCM : ${formatScore(qcmAverage)} %.`
            : `Moyenne QCM récente : ${formatScore(recentQcmAverage as number)} %.`,
      excluded: false,
    },
    {
      key: "consistency",
      label: "Régularité",
      weightPercent: round1(effective.consistency * 100),
      factorScore: consistencyScore,
      contributionPoints: round1(contribution.consistency),
      detail: `Basée sur l’inactivité : ${inactiveDays} jour${inactiveDays > 1 ? "s" : ""}.`,
      excluded: false,
    },
    {
      key: "pace",
      label: "Rythme",
      weightPercent: paceRedistributed ? 0 : round1(effective.pace * 100),
      factorScore: paceScore,
      contributionPoints:
        contribution.pace == null ? null : round1(contribution.pace),
      detail: paceRedistributed
        ? "Rythme non calculable : son poids a été redistribué sur progression, QCM et régularité."
        : currentPace != null && requiredPace != null
          ? `Rythme ${formatScore(currentPace)} / semaine · objectif ${formatScore(requiredPace)} / semaine.`
          : "Rythme pris en compte dans le calcul.",
      excluded: paceRedistributed,
    },
  ];

  const { helps, improve } = buildHelpsImprove({
    progressScore,
    qcmScore,
    consistencyScore,
    paceScore,
    currentPace,
    requiredPace,
    inactiveDays,
  });

  return {
    mode: "available",
    readinessScore,
    recomputedScore: round0(clamp(recomputed, 0, 100)),
    paceRedistributed,
    factors,
    helps,
    improve,
    issueMessages,
    unavailableReasons: [],
    disclaimer: READINESS_DISCLAIMER,
  };
}
