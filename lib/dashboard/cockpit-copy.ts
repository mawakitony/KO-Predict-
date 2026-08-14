import { differenceInCalendarDays, parseISO, startOfDay } from "date-fns";
import type {
  PaceStatus,
  PredictionDataIssue,
  RiskLevel,
} from "@/types/prediction";
import { ISSUE_LEARNER_MESSAGES } from "@/lib/dashboard/learner-presentation";

/** Libellés risque pour l’apprenant (pas RED/AMBER/GREEN bruts). */
export function cockpitRiskLabel(level: RiskLevel | null): string {
  switch (level) {
    case "GREEN":
      return "Trajectoire maîtrisée";
    case "AMBER":
      return "À surveiller";
    case "RED":
      return "Risque élevé";
    case "CRITICAL":
      return "Risque élevé";
    default:
      return "Statut non évalué";
  }
}

export type CockpitRiskTone = "good" | "warn" | "danger" | "neutral";

export function cockpitRiskTone(level: RiskLevel | null): CockpitRiskTone {
  switch (level) {
    case "GREEN":
      return "good";
    case "AMBER":
      return "warn";
    case "RED":
    case "CRITICAL":
      return "danger";
    default:
      return "neutral";
  }
}

/** Phrase sous le score — dérivée du statut de rythme existant. */
export function cockpitHeroNarrative(input: {
  paceStatus: PaceStatus | null;
  currentPace: number | null;
  requiredPace: number | null;
  readinessScore: number | null;
}): string {
  const { paceStatus, currentPace, requiredPace, readinessScore } = input;

  if (readinessScore == null) {
    return "Votre estimation n’est pas encore disponible.";
  }

  switch (paceStatus) {
    case "ON_TRACK":
      return "Vous progressez sur une trajectoire compatible avec votre objectif d’examen.";
    case "AHEAD":
      return "Vous êtes en avance sur le rythme requis : maintenez cette dynamique jusqu’à l’examen.";
    case "SLIGHTLY_BEHIND":
      if (currentPace != null && requiredPace != null) {
        return `Vous progressez, mais votre rythme actuel (${formatPaceShort(currentPace)}) reste inférieur au rythme nécessaire (${formatPaceShort(requiredPace)}) pour votre date d’examen.`;
      }
      return "Vous progressez, mais votre rythme actuel reste légèrement inférieur au rythme nécessaire pour votre date d’examen.";
    case "BEHIND":
      if (currentPace != null && requiredPace != null) {
        return `Votre rythme actuel (${formatPaceShort(currentPace)}) est insuffisant face au rythme requis (${formatPaceShort(requiredPace)}) pour rester aligné avec votre date d’examen.`;
      }
      return "Votre rythme actuel est insuffisant pour rester aligné avec votre date d’examen.";
    case "NO_ACTIVITY":
      return "Aucune activité récente n’a été détectée : reprenez votre formation pour actualiser votre trajectoire.";
    default:
      return "KO Predict™ suit votre préparation et affinera ce message dès que le rythme sera établi.";
  }
}

function formatPaceShort(value: number): string {
  const n = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${n} activités / semaine`;
}

/** « Pourquoi ? » sous la priorité — uniquement données déjà disponibles. */
export function cockpitPriorityWhy(input: {
  paceHint: string | null;
  currentPace: number | null;
  requiredPace: number | null;
  issues: PredictionDataIssue[];
}): string | null {
  if (input.paceHint?.trim()) return input.paceHint.trim();

  if (
    input.currentPace != null &&
    input.requiredPace != null &&
    input.requiredPace > input.currentPace
  ) {
    return `Vous réalisez actuellement ${formatPaceShort(input.currentPace).replace(" activités / semaine", "")} activités par semaine alors qu’environ ${formatPaceShort(input.requiredPace).replace(" activités / semaine", "")} sont nécessaires pour rester aligné avec votre objectif.`;
  }

  const firstIssue = input.issues[0];
  if (firstIssue) {
    return ISSUE_LEARNER_MESSAGES[firstIssue] ?? null;
  }

  return null;
}

export function cockpitDaysUntil(
  targetDate: string | null,
  asOf: Date = new Date(),
): number | null {
  if (!targetDate) return null;
  try {
    return differenceInCalendarDays(
      startOfDay(parseISO(targetDate)),
      startOfDay(asOf),
    );
  } catch {
    return null;
  }
}

/**
 * Interprétation calendrier : readiness estimée vs date cible.
 * Utilise uniquement les dates déjà calculées par le moteur.
 */
export function cockpitCountdownInterpretation(input: {
  targetExamDate: string | null;
  predictedReadinessDate: string | null;
}): string | null {
  const { targetExamDate, predictedReadinessDate } = input;
  if (!targetExamDate) return null;
  if (!predictedReadinessDate) {
    return "La date estimée de préparation n’est pas encore disponible.";
  }

  try {
    const target = startOfDay(parseISO(targetExamDate));
    const ready = startOfDay(parseISO(predictedReadinessDate));
    const gap = differenceInCalendarDays(ready, target);

    if (gap > 0) {
      const label = gap === 1 ? "1 jour" : `${gap} jours`;
      return `Au rythme actuel, votre préparation arriverait environ ${label} après votre date cible.`;
    }
    if (gap < 0) {
      const ahead = Math.abs(gap);
      const label = ahead === 1 ? "1 jour" : `${ahead} jours`;
      return `Votre trajectoire actuelle vous place environ ${label} avant votre date cible.`;
    }
    return "Votre trajectoire actuelle est compatible avec votre date cible.";
  } catch {
    return null;
  }
}

/** Pistes d’amélioration selon les issues présentes uniquement. */
export function cockpitEstimationTips(
  issues: PredictionDataIssue[],
): string[] {
  const tips: string[] = [];
  const set = new Set(issues);

  if (
    set.has("ZERO_CURRENT_PACE") ||
    set.has("INSUFFICIENT_ACTIVITY_FOR_PACE") ||
    set.has("INCOMPLETE_METRICS")
  ) {
    tips.push("continuez votre progression");
  }
  if (set.has("INSUFFICIENT_QCM")) {
    tips.push("réalisez davantage de QCM");
  }
  if (set.has("MISSING_TARGET_DATE") || set.has("TARGET_DATE_PASSED")) {
    tips.push("renseignez votre date d’examen");
  }

  return tips;
}

export function formatStudyHours(minutes: number): string {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
