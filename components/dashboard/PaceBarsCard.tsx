/** Comparaison rythme actuel vs nécessaire — style bar chart analytics. */
export function PaceBarsCard({
  currentPace,
  requiredPace,
}: {
  currentPace: number | null;
  requiredPace: number | null;
}) {
  const current = currentPace != null && currentPace > 0 ? currentPace : 0;
  const required = requiredPace != null && requiredPace > 0 ? requiredPace : 0;
  const max = Math.max(current, required, 1);
  const weeks = ["S1", "S2", "S3", "S4", "S5", "S6", "S7"];

  return (
    <article className="ko-dash-card flex h-full min-h-[22rem] flex-col p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="ko-display text-lg font-bold text-slate-900">
            Rythme d&apos;étude
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Actuel vs nécessaire (activités / semaine)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[var(--dash-primary)]" />
            Actuel
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" />
            Nécessaire
          </span>
        </div>
      </div>

      <div className="relative mt-8 flex flex-1 items-end gap-2 sm:gap-3">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="border-t border-dashed border-slate-100" />
          ))}
        </div>

        {weeks.map((week) => (
          <div
            key={week}
            className="relative z-10 flex flex-1 flex-col items-center gap-2"
          >
            <div className="flex h-44 w-full items-end justify-center gap-1">
              <div
                className="w-[42%] max-w-[1.35rem] rounded-t-md bg-[var(--dash-primary)] transition-[height] duration-700"
                style={{
                  height: `${Math.max(6, (current / max) * 100)}%`,
                }}
                title={`Actuel : ${current || "—"}`}
              />
              <div
                className="w-[42%] max-w-[1.35rem] rounded-t-md bg-slate-200 transition-[height] duration-700"
                style={{
                  height: `${Math.max(6, (required / max) * 100)}%`,
                }}
                title={`Nécessaire : ${required || "—"}`}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              {week}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-sm">
        <p className="text-slate-500">
          Actuel{" "}
          <span className="ko-display font-bold text-slate-900">
            {current > 0 ? current : "—"}
          </span>
        </p>
        <p className="text-slate-500">
          Nécessaire{" "}
          <span className="ko-display font-bold text-slate-900">
            {required > 0 ? required : "—"}
          </span>
        </p>
      </div>
    </article>
  );
}
