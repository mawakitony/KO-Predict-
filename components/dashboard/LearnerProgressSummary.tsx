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
      className="ko-dash-card overflow-hidden p-5 sm:p-6"
      aria-labelledby="learner-progress-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Parcours LearnWorlds
          </p>
          <h2
            id="learner-progress-title"
            className="ko-display mt-1 text-xl font-semibold text-slate-900"
          >
            Ma progression pédagogique
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {formatSyncRelativeFr(recordedAt)}
          </p>
        </div>
      </div>

      {empty ? (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
          <p className="font-medium text-slate-800">
            Vos résultats apparaîtront ici au fur et à mesure de votre
            progression.
          </p>
          <p className="mt-2 text-slate-500">
            Continuez votre formation sur LearnWorlds : activités et quiz
            s’afficheront automatiquement après synchronisation.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            value={hasQcm ? formatPercentOrDash(qcmAverage) : "Pas encore de résultat"}
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

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/learning?tab=activities"
          className="inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Voir mes activités
        </Link>
        <Link
          href="/learning?tab=quizzes"
          className="inline-flex rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
        >
          Voir mes quiz &amp; examens
        </Link>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
