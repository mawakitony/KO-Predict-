import type { ReactNode } from "react";
import { LEARNER_COPY } from "@/lib/learner/copy";
import { formatDateFr, formatDateTimeFr } from "@/lib/dashboard/format";

interface LearnerDatesPanelProps {
  targetExamDate: string | null;
  predictedCompletionDate: string | null;
  predictedReadinessDate: string | null;
  updatedAt: string;
  dataSource: "database" | "demo" | string;
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function barWidth(days: number | null, hasDate: boolean): number {
  if (!hasDate) return 8;
  if (days == null) return 12;
  if (days <= 0) return 100;
  return Math.max(18, Math.min(100, 100 - Math.min(days, 120) * 0.65));
}

function IconCalendar({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
    </svg>
  );
}

function IconFlag({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 21V4M5 4h9l-1.5 3.5L14 11H5" />
    </svg>
  );
}

function IconTarget({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function statusLabel(days: number | null, hasDate: boolean): string {
  if (!hasDate) return "En attente";
  if (days == null) return "—";
  if (days > 0) return `J-${days}`;
  if (days === 0) return "Aujourd'hui";
  return "Passé";
}

/** Panneau dates — timeline claire et premium. */
export function LearnerDatesPanel({
  targetExamDate,
  predictedCompletionDate,
  predictedReadinessDate,
  updatedAt,
  dataSource,
}: LearnerDatesPanelProps) {
  const rows: Array<{
    label: string;
    date: string | null;
    empty: string;
    color: string;
    soft: string;
    accent: string;
    icon: ReactNode;
    hint: string;
  }> = [
    {
      label: "Date cible d'examen",
      date: targetExamDate,
      empty: "Date d'examen non renseignée",
      color: "#1d4ed8",
      soft: "#dbeafe",
      accent: "#2563eb",
      icon: <IconCalendar />,
      hint: "Votre échéance officielle",
    },
    {
      label: "Fin de formation prévue",
      date: predictedCompletionDate,
      empty: "En attente",
      color: "#0f766e",
      soft: "#ccfbf1",
      accent: "#0d9488",
      icon: <IconFlag />,
      hint: "Estimation KO Predict™",
    },
    {
      label: "Prêt pour l'examen",
      date: predictedReadinessDate,
      empty: "En attente",
      color: "#0369a1",
      soft: "#e0f2fe",
      accent: "#0ea5e9",
      icon: <IconTarget />,
      hint: "Quand vous serez prêt",
    },
  ];

  return (
    <section
      id="learner-dates"
      className="ko-dates-panel ko-dash-card h-full"
    >
      <div className="ko-dates-head">
        <div>
          <h2 className="ko-display text-lg font-bold text-slate-900">
            Dates importantes
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Jalons de votre trajectoire
          </p>
        </div>
        <span className="ko-dates-live">
          <span className="ko-analytics-pulse" />
          Suivi
        </span>
      </div>

      <ol className="ko-dates-timeline">
        {rows.map((row, index) => {
          const hasDate = Boolean(row.date);
          const days = daysUntil(row.date);
          const width = barWidth(days, hasDate);
          const pending = !hasDate;

          return (
            <li
              key={row.label}
              className={`ko-dates-item ${pending ? "is-pending" : "is-ready"}`}
              style={{
                ["--date-color" as string]: row.accent,
                ["--date-soft" as string]: row.soft,
                ["--date-text" as string]: row.color,
                animationDelay: `${80 + index * 70}ms`,
              }}
            >
              {index < rows.length - 1 ? (
                <span className="ko-dates-connector" aria-hidden />
              ) : null}

              <span className="ko-dates-icon" aria-hidden>
                {row.icon}
              </span>

              <div className="ko-dates-body">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
                      {row.label}
                    </p>
                    <p className="ko-display mt-1 text-[1.15rem] font-extrabold tracking-tight text-slate-900">
                      {hasDate && row.date ? formatDateFr(row.date) : row.empty}
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      {row.hint}
                    </p>
                  </div>
                  <span className="ko-dates-badge">
                    {statusLabel(days, hasDate)}
                  </span>
                </div>

                <div className="ko-dates-track" aria-hidden>
                  <div
                    className="ko-dates-fill"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="ko-dates-footer">
        {dataSource === "database"
          ? `${LEARNER_COPY.datesSyncPrefix} : ${formatDateTimeFr(updatedAt)}`
          : `MAJ ${formatDateTimeFr(updatedAt)} · Démo`}
      </p>
    </section>
  );
}
