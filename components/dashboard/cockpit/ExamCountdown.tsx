import { LEARNER_COPY } from "@/lib/learner/copy";
import {
  cockpitCountdownInterpretation,
  cockpitDaysUntil,
} from "@/lib/dashboard/cockpit-copy";
import { formatDateFr } from "@/lib/dashboard/format";

interface ExamCountdownProps {
  targetExamDate: string | null;
  predictedReadinessDate: string | null;
  trajectoryHeadline: string | null;
}

export function ExamCountdown({
  targetExamDate,
  predictedReadinessDate,
  trajectoryHeadline,
}: ExamCountdownProps) {
  const days = cockpitDaysUntil(targetExamDate);
  const interpretation = cockpitCountdownInterpretation({
    targetExamDate,
    predictedReadinessDate,
  });

  let jLabel: string | null = null;
  if (days != null) {
    if (days > 0) jLabel = `J-${days}`;
    else if (days === 0) jLabel = "Jour J";
    else jLabel = `J+${Math.abs(days)}`;
  }

  return (
    <section
      className="ko-cockpit-card ko-cockpit-countdown"
      aria-labelledby="countdown-title"
    >
      <p className="ko-cockpit-kicker" id="countdown-title">
        Votre examen
      </p>

      {!targetExamDate ? (
        <>
          <p className="ko-cockpit-countdown-empty">
            Date d&apos;examen non renseignée
          </p>
          <p className="ko-cockpit-muted mt-2">
            {LEARNER_COPY.examCountdownMissing}
          </p>
        </>
      ) : (
        <>
          <p className="ko-cockpit-jlabel" aria-label={`Compte à rebours ${jLabel}`}>
            {jLabel}
          </p>
          <p className="ko-cockpit-exam-date">
            {formatDateFr(targetExamDate)}
          </p>

          <div className="ko-cockpit-ready-line">
            <span>Date estimée de préparation</span>
            <strong>
              {predictedReadinessDate
                ? formatDateFr(predictedReadinessDate)
                : "Pas encore assez de données"}
            </strong>
          </div>

          {interpretation ? (
            <p className="ko-cockpit-interpretation">{interpretation}</p>
          ) : null}

          {trajectoryHeadline ? (
            <p className="ko-cockpit-traj-note">{trajectoryHeadline}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
