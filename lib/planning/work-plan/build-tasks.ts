import type { WeeklyPlan } from "@/lib/planning/weekly-plan";
import type {
  WorkPlanBuildInput,
  WorkPlanSnapshot,
  WorkPlanTask,
  WorkPlanType,
} from "@/lib/planning/work-plan/types";

function taskId(type: WorkPlanTask["type"], index: number): string {
  return `${type.toLowerCase()}-${index}`;
}

function pushUnique(
  tasks: WorkPlanTask[],
  task: Omit<WorkPlanTask, "id">,
): void {
  if (tasks.some((t) => t.type === task.type)) return;
  if (tasks.length >= 5) return;
  tasks.push({ ...task, id: taskId(task.type, tasks.length + 1) });
}

/**
 * Construit 2–5 tâches déterministes à partir du WeeklyPlan + contexte.
 * QCM = guidance uniquement (pas de completed auto V1).
 */
export function buildWorkPlanTasks(options: {
  planType: WorkPlanType;
  weekly: WeeklyPlan;
  input: WorkPlanBuildInput;
  snapshot: WorkPlanSnapshot;
}): WorkPlanTask[] {
  const { planType, weekly, input, snapshot } = options;
  const tasks: WorkPlanTask[] = [];
  const missingDate =
    input.targetExamDate == null || input.targetExamDate.trim() === "";
  const learningDone =
    input.remainingActivities === 0 || weekly.status === "COMPLETE";

  if (planType === "STARTUP") {
    pushUnique(tasks, {
      type: "ACTIVITIES",
      title: "Continuer votre progression",
      description:
        "Avancez dans vos activités LearnWorlds afin que KO Predict™ puisse mesurer votre trajectoire.",
      target: null,
      progress: 0,
      status: "TODO",
      reason: "Données encore insuffisantes pour un objectif chiffré.",
      measurable: true,
    });

    if (weekly.emphasizeQcm) {
      pushUnique(tasks, {
        type: "QCM_PRACTICE",
        title: "Réaliser vos premiers QCM",
        description:
          "Réalisez des QCM afin que KO Predict™ puisse mieux mesurer votre préparation.",
        target: null,
        progress: null,
        status: "IN_PROGRESS",
        reason: "Aucun résultat QCM fiable pour le moment.",
        measurable: false,
      });
    }

    if (missingDate) {
      pushUnique(tasks, {
        type: "TARGET_DATE",
        title: "Renseigner votre date d’examen",
        description:
          "Indiquez votre date cible d’examen dans LearnWorlds pour activer le calcul de trajectoire.",
        target: null,
        progress: null,
        status: "TODO",
        reason: "Date d’examen absente.",
        measurable: true,
      });
    }

    return tasks;
  }

  if (learningDone) {
    pushUnique(tasks, {
      type: "MAINTAIN_PACE",
      title: "Passer en révision finale",
      description:
        "Le parcours d’activités semble terminé. Concentrez-vous sur la révision et les examens blancs.",
      target: null,
      progress: null,
      status: "IN_PROGRESS",
      reason: "Plus d’activités restantes dans le parcours.",
      measurable: false,
    });
    if (weekly.emphasizeQcm) {
      pushUnique(tasks, {
        type: "QCM_PRACTICE",
        title: "Maintenir votre pratique des QCM",
        description: "Poursuivez votre pratique des QCM pendant la révision.",
        target: null,
        progress: null,
        status: "IN_PROGRESS",
        reason: "Pratique qualitative recommandée.",
        measurable: false,
      });
    }
    return tasks;
  }

  if (planType === "CATCH_UP") {
    if (
      weekly.status === "NO_ACTIVITY" ||
      input.paceStatus === "NO_ACTIVITY" ||
      input.currentPace === 0
    ) {
      pushUnique(tasks, {
        type: "RESUME_ACTIVITY",
        title: "Reprendre votre préparation",
        description:
          "Réalisez au moins une activité pour réactiver votre trajectoire.",
        target: null,
        progress: null,
        status: "TODO",
        reason: "Aucune activité récente détectée.",
        measurable: true,
      });
    }

    const target = snapshot.targetActivities;
    if (target != null && target > 0) {
      pushUnique(tasks, {
        type: "ACTIVITIES",
        title: "Atteindre votre objectif d’activités",
        description: `Visez ${target} activité${target > 1 ? "s" : ""} sur cette période de 7 jours.`,
        target,
        progress: 0,
        status: "TODO",
        reason: "Objectif dérivé du rythme nécessaire (requiredPace).",
        measurable: true,
      });
    } else {
      pushUnique(tasks, {
        type: "ACTIVITIES",
        title: "Continuer votre progression",
        description:
          "Avancez régulièrement dans vos activités LearnWorlds.",
        target: null,
        progress: 0,
        status: "TODO",
        reason: "Pas d’objectif chiffré disponible (requiredPace absent).",
        measurable: true,
      });
    }

    if (weekly.emphasizeQcm) {
      pushUnique(tasks, {
        type: "QCM_PRACTICE",
        title: "Poursuivre votre pratique des QCM",
        description: "Poursuivez votre pratique des QCM cette semaine.",
        target: null,
        progress: null,
        status: "IN_PROGRESS",
        reason: "Consolidation qualitative des résultats.",
        measurable: false,
      });
    }

    if (missingDate) {
      pushUnique(tasks, {
        type: "TARGET_DATE",
        title: "Renseigner votre date d’examen",
        description:
          "Indiquez votre date cible d’examen pour affiner le rythme nécessaire.",
        target: null,
        progress: null,
        status: "TODO",
        reason: "Date d’examen absente.",
        measurable: true,
      });
    }

    return tasks;
  }

  // CONSOLIDATION
  const target = snapshot.targetActivities;
  if (target != null && target > 0) {
    pushUnique(tasks, {
      type: "ACTIVITIES",
      title: "Maintenir votre rythme d’activités",
      description: `Maintenez environ ${target} activité${target > 1 ? "s" : ""} sur 7 jours pour rester aligné.`,
      target,
      progress: 0,
      status: "TODO",
      reason: "Objectif de maintien dérivé du rythme nécessaire.",
      measurable: true,
    });
  }

  pushUnique(tasks, {
    type: "MAINTAIN_PACE",
    title: "Maintenir votre trajectoire",
    description:
      "Votre rythme actuel est compatible avec votre trajectoire. Continuez régulièrement.",
    target: null,
    progress: null,
    status: "IN_PROGRESS",
    reason: weekly.reason,
    measurable: false,
  });

  pushUnique(tasks, {
    type: "QCM_PRACTICE",
    title: "Maintenir une pratique régulière des QCM",
    description: "Maintenez votre pratique des QCM.",
    target: null,
    progress: null,
    status: "IN_PROGRESS",
    reason: "Guidance qualitative — pas d’objectif chiffré V1.",
    measurable: false,
  });

  if (missingDate) {
    pushUnique(tasks, {
      type: "TARGET_DATE",
      title: "Renseigner votre date d’examen",
      description:
        "Indiquez votre date cible d’examen pour stabiliser la trajectoire.",
      target: null,
      progress: null,
      status: "TODO",
      reason: "Date d’examen absente.",
      measurable: true,
    });
  }

  return tasks;
}
