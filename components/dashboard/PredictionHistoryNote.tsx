export function PredictionHistoryNote({ hasHistory }: { hasHistory: boolean }) {
  if (hasHistory) return null;

  return (
    <section className="ko-history-note" aria-label="Historique des estimations">
      <span className="ko-history-icon" aria-hidden>
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 15v-3M12 15V9M16 15v-5" />
        </svg>
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800">
          Historique bientôt disponible
        </p>
        <p className="mt-0.5 text-sm text-slate-500">
          Votre historique commencera à apparaître après les premiers calculs de
          KO Predict™.
        </p>
      </div>
    </section>
  );
}
