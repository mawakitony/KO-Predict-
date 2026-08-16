import { cockpitDaysUntil } from "@/lib/dashboard/cockpit-copy";
import { formatDateFr } from "@/lib/dashboard/format";

interface CollectionExamCardProps {
  targetExamDate: string | null;
  certification: string;
}

/** Examen / J-n en mode collecte — compact, professionnel. */
export function CollectionExamCard({
  targetExamDate,
  certification,
}: CollectionExamCardProps) {
  const days = cockpitDaysUntil(targetExamDate);

  let jLabel: string | null = null;
  if (days != null) {
    if (days > 0) jLabel = `J-${days}`;
    else if (days === 0) jLabel = "Jour J";
    else jLabel = `J+${Math.abs(days)}`;
  }

  return (
    <section className="ko-collect-exam" aria-labelledby="exam-collect-title">
      <p id="exam-collect-title" className="ko-collect-exam-kicker">
        Votre examen {certification}
      </p>

      {!targetExamDate ? (
        <p className="ko-collect-exam-missing">
          Date d&apos;examen non renseignée
        </p>
      ) : (
        <div className="ko-collect-exam-row">
          <p className="ko-collect-exam-j">{jLabel}</p>
          <span className="ko-collect-exam-sep" aria-hidden />
          <p className="ko-collect-exam-date">
            {formatDateFr(targetExamDate)}
          </p>
          <span className="ko-collect-exam-sep is-desktop" aria-hidden />
          <p className="ko-collect-exam-note">
            Les estimations de trajectoire apparaîtront lorsque suffisamment de
            données seront disponibles.
          </p>
        </div>
      )}
    </section>
  );
}
