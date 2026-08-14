import { round0, round1 } from "@/lib/prediction/math";
import type { PaceStatus, RiskLevel } from "@/types/prediction";

/**
 * Recommandation V1 basée sur des règles (pas d'IA).
 */
export function generateRecommendedAction(options: {
  riskLevel: RiskLevel | null;
  paceStatus: PaceStatus | null;
  requiredPace: number | null;
  currentPace: number | null;
  remainingActivities: number | null;
  issues: string[];
}): string | null {
  const {
    riskLevel,
    paceStatus,
    requiredPace,
    currentPace,
    remainingActivities,
    issues,
  } = options;

  if (issues.includes("MISSING_TARGET_DATE")) {
    return "Définissez votre date cible d'examen pour obtenir une prédiction.";
  }

  if (issues.includes("INSUFFICIENT_QCM")) {
    return "Pas encore assez de données QCM. Réalisez un premier questionnaire d'entraînement.";
  }

  if (paceStatus === "NO_ACTIVITY" || issues.includes("ZERO_CURRENT_PACE")) {
    return "Reprenez une session d'étude dès aujourd'hui pour réactiver votre trajectoire.";
  }

  if (issues.includes("INSUFFICIENT_ACTIVITY_FOR_PACE")) {
    return "Pas encore assez d'activité pour calculer votre rythme. Complétez quelques activités cette semaine.";
  }

  if (remainingActivities === 0) {
    return "Vous avez terminé le contenu. Concentrez-vous sur la révision finale et les examens blancs.";
  }

  if (riskLevel === "CRITICAL") {
    return "Une intervention du coach est recommandée.";
  }

  const weeklyTarget =
    requiredPace != null && requiredPace > 0
      ? Math.max(1, round0(requiredPace))
      : null;
  const practiceQuestions =
    weeklyTarget != null ? weeklyTarget * 25 : null; // règle V1 simple

  if (riskLevel === "RED") {
    if (weeklyTarget != null && practiceQuestions != null) {
      return `Augmentez votre rythme d'étude et concentrez-vous sur vos domaines faibles. Cette semaine, visez ${weeklyTarget} activités et environ ${practiceQuestions} questions d'entraînement.`;
    }
    return "Augmentez votre rythme d'étude et concentrez-vous sur vos domaines faibles.";
  }

  if (riskLevel === "AMBER") {
    if (weeklyTarget != null && practiceQuestions != null) {
      return `Augmentez légèrement votre rythme cette semaine. Terminez ${weeklyTarget} activités et réalisez environ ${practiceQuestions} questions.`;
    }
    return "Augmentez légèrement votre rythme cette semaine.";
  }

  if (riskLevel === "GREEN") {
    if (
      currentPace != null &&
      requiredPace != null &&
      currentPace + 0.1 < requiredPace &&
      weeklyTarget != null
    ) {
      return `Continuez sur votre lancée et maintenez au moins ${weeklyTarget} activités / semaine (${round1(currentPace)} actuellement).`;
    }
    return "Continuez votre rythme actuel.";
  }

  return null;
}
