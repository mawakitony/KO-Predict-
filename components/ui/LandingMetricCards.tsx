/** Collage de cartes décoratives (style landing SaaS — pas de données live). */
export function LandingMetricCards() {
  const r = 38;
  const c = 2 * Math.PI * r;
  const prep = 0.72 * c;
  const prob = 0.68 * c;

  return (
    <div className="relative mx-auto h-[30rem] w-full max-w-[min(100%,28rem)] scale-[0.92] sm:h-[37rem] sm:scale-100">
      <div aria-hidden className="ko-landing-stage" />

      <article className="ko-landing-card ko-fade-up absolute left-2 top-[7.25rem] z-20 w-[14.75rem] rotate-[-2deg] p-5 sm:left-3 sm:w-[16.25rem]">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="ko-display text-[2rem] font-black tracking-tight text-slate-900">
              72%
            </p>
            <p className="mt-0.5 text-xs font-medium text-slate-400">
              Préparation · objectif 100%
            </p>
          </div>
          <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-500">
            Live
          </span>
        </div>
        <svg viewBox="0 0 220 72" className="mt-3 h-[4.5rem] w-full" aria-hidden>
          <defs>
            <linearGradient id="land-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            className="ko-line-fill"
            d="M4 52 C 36 48, 50 22, 78 30 S 120 62, 148 36 S 188 16, 216 28 L 216 72 L 4 72 Z"
            fill="url(#land-fill)"
          />
          <path
            className="ko-line-draw"
            d="M4 52 C 36 48, 50 22, 78 30 S 120 62, 148 36 S 188 16, 216 28"
            fill="none"
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle
            cx="148"
            cy="36"
            r="5"
            fill="#fff"
            stroke="#f43f5e"
            strokeWidth="2.5"
            className="ko-dot-pop"
            style={{ animationDelay: "1s" }}
          />
        </svg>
        <div className="mt-3 flex items-center gap-3">
          <span className="ko-landing-cta-sm">Voir le détail</span>
          <span className="text-[11px] font-medium text-slate-400">
            Estimations KO Predict™
          </span>
        </div>
      </article>

      <article className="ko-landing-card ko-fade-up ko-fade-up-delay-1 absolute right-1 top-1 z-30 w-[10.75rem] rotate-[3deg] p-4 sm:right-2 sm:w-[11.75rem]">
        <div className="relative mx-auto flex h-[5.75rem] w-[5.75rem] items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id="land-ring-a" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#eef2f7"
              strokeWidth="9"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="url(#land-ring-a)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${prep} ${c}`}
              className="ko-ring-draw"
            />
          </svg>
          <span className="ko-display absolute text-xl font-black text-slate-900">
            72
          </span>
        </div>
        <div className="mt-2 space-y-1.5 text-[11px] text-slate-500">
          <p className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Readiness
            </span>
            <span className="font-bold text-slate-800">72%</span>
          </p>
          <p className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              Objectif
            </span>
            <span className="font-bold text-slate-800">100</span>
          </p>
        </div>
      </article>

      <article className="ko-landing-card ko-fade-up ko-fade-up-delay-2 absolute right-0 top-[12.75rem] z-40 w-[10.75rem] rotate-[-1.5deg] p-4 sm:right-0 sm:w-[11.75rem]">
        <div className="relative mx-auto flex h-[5.75rem] w-[5.75rem] items-center justify-center">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id="land-ring-b" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#2dd4bf" />
                <stop offset="100%" stopColor="#0d9488" />
              </linearGradient>
            </defs>
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="#eef2f7"
              strokeWidth="9"
            />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke="url(#land-ring-b)"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={`${prob} ${c}`}
              className="ko-ring-draw"
              style={{ animationDelay: "0.15s" }}
            />
          </svg>
          <span className="ko-display absolute text-xl font-black text-slate-900">
            68
          </span>
        </div>
        <div className="mt-2 space-y-1.5 text-[11px] text-slate-500">
          <p className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              Probabilité
            </span>
            <span className="font-bold text-slate-800">68%</span>
          </p>
          <p className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              Objectif
            </span>
            <span className="font-bold text-slate-800">100</span>
          </p>
        </div>
      </article>

      <article className="ko-landing-card ko-fade-up absolute bottom-[7.25rem] left-0 z-10 w-[11.25rem] rotate-[2deg] p-4 sm:left-0 sm:w-[12.25rem]">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Activité récente
        </p>
        <p className="ko-display mt-1 text-[1.65rem] font-black text-slate-900">
          54%
        </p>
        <p className="text-[11px] font-semibold text-teal-600">
          Progression · +12 pts
        </p>
        <div className="mt-3 flex h-12 items-end justify-between gap-1">
          {[35, 55, 42, 78, 60, 88, 50].map((h, i) => (
            <div
              key={i}
              className="ko-bar-grow flex-1 rounded-sm"
              style={{
                height: `${h}%`,
                background: i % 2 === 0 ? "#7dd3fc" : "#5eead4",
                animationDelay: `${60 + i * 40}ms`,
              }}
            />
          ))}
        </div>
      </article>

      <article className="ko-landing-card ko-fade-up ko-fade-up-delay-1 absolute bottom-1 right-5 z-20 w-[12.25rem] rotate-[-2.5deg] p-4 sm:right-8 sm:w-[13.25rem]">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
          Rythme d&apos;étude
        </p>
        <p className="ko-display mt-1 text-[1.45rem] font-black tracking-tight text-slate-900">
          Sur la voie
        </p>
        <p className="text-[11px] font-medium text-slate-400">
          Dernière semaine
        </p>
        <div className="mt-3 flex h-12 items-end justify-between gap-1">
          {[48, 62, 40, 70, 55, 82, 66].map((h, i) => (
            <div
              key={i}
              className="ko-bar-grow flex-1 rounded-sm"
              style={{
                height: `${h}%`,
                background: i % 2 === 0 ? "#67e8f9" : "#fda4af",
                animationDelay: `${100 + i * 40}ms`,
              }}
            />
          ))}
        </div>
      </article>
    </div>
  );
}
