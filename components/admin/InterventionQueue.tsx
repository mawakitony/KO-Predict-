import Link from "next/link";
import type { AdminStudentRow } from "@/lib/admin/types";
import {
  formatDateShortFr,
  formatPercent,
  riskLabel,
  riskToneClasses,
} from "@/lib/dashboard/format";
import { AdminAvatar } from "@/components/admin/AdminUi";

interface InterventionQueueProps {
  rows: AdminStudentRow[];
}

export function InterventionQueue({ rows }: InterventionQueueProps) {
  return (
    <section
      className="rounded-2xl border border-[var(--border)] bg-slate-50/70 p-5 sm:p-6"
      aria-labelledby="interventions-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2
            id="interventions-title"
            className="ko-display text-lg font-semibold text-slate-900"
          >
            Interventions prioritaires
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            CRITICAL, puis RED, puis AMBER — à traiter en priorité.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
          {rows.length}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          Aucune intervention prioritaire pour le moment.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-200/80">
          {rows.map((row) => {
            const tone = riskToneClasses(row.prediction.riskLevel);
            return (
              <li
                key={row.student.studentId}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <AdminAvatar name={row.student.fullName} size="sm" />
                  <div>
                    <p className="font-semibold text-slate-900">
                      {row.student.fullName}
                    </p>
                    <p className="text-sm text-slate-500">
                      {row.student.certification} · Prob.{" "}
                      {formatPercent(row.prediction.readinessProbability)} ·
                      Prêt{" "}
                      {formatDateShortFr(
                        row.prediction.predictedReadinessDate,
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone.badge}`}
                  >
                    {row.prediction.riskLevel} —{" "}
                    {riskLabel(row.prediction.riskLevel)}
                  </span>
                  <Link
                    href={`/admin/students/${row.student.studentId}`}
                    className="inline-flex rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--accent-hover)]"
                  >
                    Voir
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
