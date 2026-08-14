import { cockpitDaysUntil } from "@/lib/dashboard/cockpit-copy";
import { formatDateFr } from "@/lib/dashboard/format";

interface CollectionExamCardProps {
  targetExamDate: string | null;
  certification: string;
}

/** Examen / J-n en mode collecte — compact, sans cartes « En attente ». */
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
    <section
      className="ko-collect-exam"
      aria-labelledby="exam-collect-title"
    >
      <div className="ko-collect-exam-head">
        <p
          id="exam-collect-title"
          className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400"
        >
          Votre examen
        </p>
        <p className="text-sm font-semibold text-slate-600">{certification}</p>
      </div>

      {!targetExamDate ? (
        <p className="ko-display mt-2 text-lg font-bold text-amber-800">
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
