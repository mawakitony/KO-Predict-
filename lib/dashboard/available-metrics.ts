import { formatStudyHours } from "@/lib/dashboard/cockpit-copy";

export type AvailableMetricItem = {
  key: string;
  label: string;
  value: string;
};

/**
 * Métriques compactes mode collecte.
 * null ≠ 0 : un vrai 0 s'affiche ; null n'invente pas de pourcentage.
 */
export function buildAvailableMetrics(input: {
  progressPercent: number | null;
  completedActivities: number;
  totalActivities: number;
  studyTimeMinutes: number;
  qcmAverage: number | null;
  inactiveDays: number;
}): AvailableMetricItem[] {
  const items: AvailableMetricItem[] = [];

  if (input.progressPercent != null) {
    items.push({
      key: "progress",
      label: "Progression",
      value: `${Math.round(input.progressPercent)} %`,
    });
  }

  items.push({
    key: "activities",
    label: "Activités",
    value: `${input.completedActivities} / ${Math.max(input.totalActivities, 0)}`,
  });

  items.push({
    key: "study",
    label: "Temps d'étude",
    value:
      input.studyTimeMinutes > 0
        ? formatStudyHours(input.studyTimeMinutes)
        : "0 min",
  });

  if (input.qcmAverage != null) {
    items.push({
      key: "qcm",
      label: "Moyenne QCM",
      value: `${Math.round(input.qcmAverage)} %`,
    });
  }

  // Mode collecte uniquement : formulation neutre (pas « inactivité »).
  items.push({
    key: "inactive",
    label: "Dernière activité",
    value:
      input.inactiveDays <= 0
        ? "aujourd'hui"
        : input.inactiveDays === 1
          ? "il y a 1 jour"
          : `il y a ${input.inactiveDays} jours`,
  });

  return items;
}
