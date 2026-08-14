/**
 * Hero mode collecte — design validé (DataCollectionBanner).
 * Orbite, badges, barre de collecte, manques, prochaine étape.
 */

function IconPulse({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12h3l2.5-6 4 12L16 9h5" />
    </svg>
  );
}

function IconQuiz({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 11h6M9 15h3" />
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 4V3M16 4V3" />
    </svg>
  );
}

function IconClock({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 1.5" />
    </svg>
  );
}

function IconCheck({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function pickIcon(text: string) {
  const lower = text.toLowerCase();
  if (
    lower.includes("qcm") ||
    lower.includes("maîtrise") ||
    lower.includes("maitrise")
  ) {
    return <IconQuiz className="h-5 w-5" />;
  }
  if (
    lower.includes("rythme") ||
    lower.includes("étude") ||
    lower.includes("etude") ||
    lower.includes("activité")
  ) {
    return <IconPulse className="h-5 w-5" />;
  }
  return <IconClock className="h-5 w-5" />;
}

interface CollectionHeroProps {
  explanations: string[];
}

export function CollectionHero({ explanations }: CollectionHeroProps) {
  const steps =
    explanations.length > 0
      ? explanations
      : [
          "Continuez vos activités de formation.",
          "Réalisez des QCM pour établir votre niveau.",
        ];

  return (
    <section
      className="ko-collect-banner"
      aria-labelledby="collecting-title"
    >
      <div className="ko-collect-glow" aria-hidden />

      <div className="relative grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="ko-collect-orbit" aria-hidden>
          <span className="ko-collect-orbit-ring" />
          <span className="ko-collect-orbit-ring ko-collect-orbit-ring-2" />
          <span className="ko-collect-core">
            <IconPulse className="h-7 w-7 text-white" />
          </span>
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="ko-collect-badge">
              <span className="ko-analytics-pulse" />
              Collecte en cours
            </span>
            <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-bold text-slate-500">
              Pas un mauvais résultat
            </span>
          </div>

          <h2
            id="collecting-title"
            className="ko-display mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]"
          >
            KO Predict™ construit votre estimation
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-600">
            Continuez votre formation et réalisez des QCM. Dès que suffisamment
            de données seront disponibles, votre première estimation de
            préparation apparaîtra automatiquement.
          </p>

          <div className="ko-collect-meter mt-5" aria-hidden>
            <div className="ko-collect-meter-bar" />
          </div>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-blue-700/80">
            Progression de la collecte
          </p>
        </div>
      </div>

      <ul className="relative mt-6 grid gap-3 sm:grid-cols-2">
        {steps.map((text, index) => (
          <li key={text} className="ko-collect-step">
            <span className="ko-collect-step-icon">{pickIcon(text)}</span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
                Manque {index + 1}
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">
                {text}
              </p>
            </div>
          </li>
        ))}
        <li className="ko-collect-step ko-collect-step-ok sm:col-span-2">
          <span className="ko-collect-step-icon ko-collect-step-icon-ok">
            <IconCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-teal-700/80">
              Prochaine étape
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug text-slate-800">
              Suivez votre formation LearnWorlds : KO Predict™ mettra à jour
              votre tableau de bord dès que possible.
            </p>
          </div>
        </li>
      </ul>
    </section>
  );
}
