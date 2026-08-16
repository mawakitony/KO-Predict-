import { Icon3dCoach } from "@/components/learning/Learning3dIcons";
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
      className="ko-learn-panel"
      aria-labelledby="coach-followup-title"
    >
      <div className="ko-learn-panel-head">
        <div className="ko-learn-panel-title-row">
          <span className="ko-learn-card-icon" aria-hidden>
            <Icon3dCoach className="ko-learn-3d is-sm" />
          </span>
          <div>
            <h2 id="coach-followup-title" className="ko-learn-panel-title">
              Suivi coach
            </h2>
            <p className="ko-learn-panel-sub">
              Historique léger des cycles d’intervention.
            </p>
          </div>
        </div>
      </div>

      {interventions.length === 0 ? (
        <p className="ko-learn-empty">
          Aucun suivi coach enregistré pour cet apprenant.
        </p>
      ) : (
        <ol className="ko-learn-list">
          {interventions.map((item) => (
            <li key={item.id} className="ko-learn-card">
              <div className="ko-learn-card-icon">
                <Icon3dCoach />
              </div>
              <div className="ko-learn-card-body">
                <p className="ko-learn-card-title">
                  {interventionStatusLabelFr(item.status)}
                  {item.riskLevel ? ` · ${item.riskLevel}` : ""}
                </p>
                <p className="ko-learn-card-meta">
                  Ouvert le {formatDateFr(item.createdAt.slice(0, 10))}
                  {" · "}
                  {item.reasons.map(interventionReasonLabelFr).join(" · ") ||
                    "Motif non précisé"}
                </p>
                <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
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
                      {formatDateTimeFr(item.resolvedAt)} — Intervention
                      terminée
                    </li>
                  ) : null}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
