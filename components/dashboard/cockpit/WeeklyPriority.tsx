interface WeeklyPriorityProps {
  action: string;
  why: string | null;
}

export function WeeklyPriority({ action, why }: WeeklyPriorityProps) {
  return (
    <section
      className="ko-cockpit-card ko-cockpit-priority"
      aria-labelledby="priority-title"
    >
      <p className="ko-cockpit-kicker is-accent" id="priority-title">
        Priorité de la semaine
      </p>
      <p className="ko-cockpit-priority-action">{action}</p>
      {why ? (
        <div className="ko-cockpit-why">
          <p className="ko-cockpit-why-label">Pourquoi ?</p>
          <p className="ko-cockpit-why-text">{why}</p>
        </div>
      ) : null}
    </section>
  );
}
