import Link from "next/link";
import type { CoachInterventionCard } from "@/lib/admin/interventions/types";
import { summarizeInterventionCounts } from "@/lib/admin/interventions/summary";

export function SchoolInterventionSummary({
  cards,
}: {
  cards: CoachInterventionCard[];
}) {
  const counts = summarizeInterventionCounts(cards);
  const activeCards = cards
    .filter((c) => c.intervention.status !== "RESOLVED")
    .slice(0, 3);

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      aria-labelledby="school-interventions-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="school-interventions-title"
            className="ko-display text-lg font-semibold text-slate-900"
          >
            Interventions prioritaires
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Résumé coach — {counts.active} active
            {counts.active > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin?tab=kopredict"
          className="inline-flex rounded-full bg-[var(--admin-blue)] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[var(--admin-blue-hover)]"
        >
          Voir la file complète
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-rose-50 px-3 py-2.5 text-center ring-1 ring-rose-100">
          <p className="text-lg font-extrabold text-rose-700">
            {counts.critical}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-600">
            Critiques
          </p>
        </div>
        <div className="rounded-xl bg-orange-50 px-3 py-2.5 text-center ring-1 ring-orange-100">
          <p className="text-lg font-extrabold text-orange-800">{counts.red}</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">
            Élevés
          </p>
        </div>
        <div className="rounded-xl bg-amber-50 px-3 py-2.5 text-center ring-1 ring-amber-100">
          <p className="text-lg font-extrabold text-amber-900">
            {counts.amber}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">
            Ambre
          </p>
        </div>
      </div>

      {activeCards.length > 0 ? (
        <ul className="mt-4 divide-y divide-slate-100">
          {activeCards.map((card) => (
            <li
              key={card.intervention.id}
              className="flex items-center justify-between gap-2 py-2 text-sm"
            >
              <span className="truncate font-medium text-slate-800">
                {card.row.student.fullName}
              </span>
              <span className="shrink-0 text-xs font-semibold text-slate-500">
                {card.intervention.riskLevel ?? "—"}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          Aucune intervention active pour le moment.
        </p>
      )}
    </section>
  );
}
