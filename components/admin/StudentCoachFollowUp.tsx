import {
  interventionReasonLabelFr,
  interventionStatusLabelFr,
  type CoachInterventionRecord,
} from "@/lib/admin/interventions/types";
import { formatDateFr, formatDateTimeFr } from "@/lib/dashboard/format";

export function StudentCoachFollowUp({
  interventions,
}: {
  interventions: CoachInterventionRecord[];
}) {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      aria-labelledby="coach-followup-title"
    >
      <h2
        id="coach-followup-title"
        className="ko-display text-lg font-semibold text-slate-900"
      >
        Suivi coach
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Historique léger des cycles d’intervention.
      </p>

      {interventions.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Aucun suivi coach enregistré pour cet apprenant.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {interventions.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">
                  {interventionStatusLabelFr(item.status)}
                  {item.riskLevel ? ` · ${item.riskLevel}` : ""}
                </p>
                <p className="text-xs text-slate-500">
                  Ouvert le {formatDateFr(item.createdAt.slice(0, 10))}
                </p>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {item.reasons.map(interventionReasonLabelFr).join(" · ") ||
                  "Motif non précisé"}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                <li>
                  {formatDateTimeFr(item.createdAt)} — Risque détecté / cycle
                  ouvert
                </li>
                {item.contactedAt ? (
                  <li>
                    {formatDateTimeFr(item.contactedAt)} — Contacté / suivi
                  </li>
                ) : null}
                {item.resolvedAt ? (
                  <li>
                    {formatDateTimeFr(item.resolvedAt)} — Intervention terminée
                  </li>
                ) : null}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
