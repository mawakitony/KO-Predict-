import Link from "next/link";
import {
  formatPercentOrDash,
  formatSyncRelativeFr,
} from "@/lib/learning/format";

interface LearnerProgressSummaryProps {
  progressPercent: number | null;
  completedActivities: number;
  totalActivities: number;
  qcmAverage: number | null;
  recentQcmAverage: number | null;
  recordedAt: string | null;
  collecting?: boolean;
}

export function LearnerProgressSummary({
  progressPercent,
  completedActivities,
  totalActivities,
  qcmAverage,
  recentQcmAverage,
  recordedAt,
  collecting = false,
}: LearnerProgressSummaryProps) {
  const hasQcm = qcmAverage != null;
  const empty =
    collecting ||
    ((progressPercent == null || progressPercent === 0) &&
      completedActivities === 0 &&
      !hasQcm);

  return (
    <section
      className="ko-lw-progress"
      aria-labelledby="learner-progress-title"
    >
      <p className="ko-lw-progress-kicker">Parcours LearnWorlds</p>
      <h2 id="learner-progress-title" className="ko-lw-progress-title">
        Ma progression pédagogique
      </h2>
      <p className="ko-lw-progress-sync">{formatSyncRelativeFr(recordedAt)}</p>

      {empty ? (
        <div className="ko-lw-progress-empty">
          <p>
            Vos résultats apparaîtront ici au fur et à mesure de votre
            progression.
          </p>
          <p>
            Continuez votre formation sur LearnWorlds : activités et quiz
            s&apos;afficheront automatiquement après synchronisation.
          </p>
        </div>
      ) : (
        <div className="ko-lw-progress-grid">
          <Stat
            label="Progression"
            value={formatPercentOrDash(progressPercent)}
          />
          <Stat
            label="Activités terminées"
            value={`${completedActivities} / ${totalActivities || "—"}`}
          />
          <Stat
            label="Moyenne QCM"
            value={
              hasQcm
                ? formatPercentOrDash(qcmAverage)
                : "Pas encore de résultat"
            }
          />
          <Stat
            label="Moyenne récente"
            value={
              recentQcmAverage == null
                ? "—"
                : formatPercentOrDash(recentQcmAverage)
            }
          />
        </div>
      )}

      <div className="ko-lw-progress-actions">
        <Link href="/learning?tab=activities" className="ko-lw-progress-cta">
          Voir mes activités
        </Link>
        <Link
          href="/learning?tab=quizzes"
          className="ko-lw-progress-cta is-ghost"
        >
          Voir mes quiz &amp; examens
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ko-lw-progress-stat">
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}
