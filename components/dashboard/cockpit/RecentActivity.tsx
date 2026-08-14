import { formatStudyHours } from "@/lib/dashboard/cockpit-copy";
import { formatDateFr } from "@/lib/dashboard/format";

interface RecentActivityProps {
  studyTimeMinutes: number;
  lastActivityDate: string | null;
  inactiveDays: number;
  completedActivities: number;
  currentPace: number | null;
}

export function RecentActivity({
  studyTimeMinutes,
  lastActivityDate,
  inactiveDays,
  completedActivities,
  currentPace,
}: RecentActivityProps) {
  const weekPace =
    currentPace == null
      ? "Pas encore assez de données"
      : `${Number.isInteger(currentPace) ? currentPace : currentPace.toFixed(1)} act. / sem.`;

  return (
    <section
      className="ko-cockpit-card"
      aria-labelledby="activity-title"
    >
      <p className="ko-cockpit-kicker" id="activity-title">
        Activité récente
      </p>
      <p className="ko-cockpit-section-lead">
        Un aperçu simple de votre comportement d&apos;apprentissage récent.
      </p>

      <dl className="ko-cockpit-activity-grid">
        <div>
          <dt>Rythme observé</dt>
          <dd>{weekPace}</dd>
        </div>
        <div>
          <dt>Temps d&apos;étude cumulé</dt>
          <dd>{formatStudyHours(studyTimeMinutes)}</dd>
        </div>
        <div>
          <dt>Dernière activité</dt>
          <dd>
            {lastActivityDate
              ? formatDateFr(lastActivityDate)
              : "Pas encore assez de données"}
          </dd>
        </div>
        <div>
          <dt>Jours d&apos;inactivité</dt>
          <dd>
            {inactiveDays <= 0
              ? "Activité récente"
              : inactiveDays === 1
                ? "1 jour"
                : `${inactiveDays} jours`}
          </dd>
        </div>
        <div>
          <dt>Activités complétées</dt>
          <dd>{completedActivities}</dd>
        </div>
      </dl>
    </section>
  );
}
