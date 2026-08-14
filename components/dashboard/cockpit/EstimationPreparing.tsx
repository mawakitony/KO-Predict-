interface EstimationPreparingProps {
  tips: string[];
  explanations: string[];
}

export function EstimationPreparing({
  tips,
  explanations,
}: EstimationPreparingProps) {
  return (
    <section
      className="ko-cockpit-card ko-cockpit-preparing"
      aria-labelledby="preparing-title"
    >
      <p className="ko-cockpit-kicker is-accent" id="preparing-title">
        Estimation en préparation
      </p>
      <h2 className="ko-cockpit-preparing-title">
        Votre estimation n&apos;est pas encore disponible.
      </h2>
      <p className="ko-cockpit-muted mt-2 max-w-2xl">
        KO Predict™ collecte encore les données nécessaires pour établir votre
        trajectoire.
      </p>

      {explanations.length > 0 ? (
        <ul className="ko-cockpit-prep-list">
          {explanations.slice(0, 4).map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {tips.length > 0 ? (
        <div className="ko-cockpit-tips">
          <p className="ko-cockpit-why-label">Pour améliorer votre estimation</p>
          <ul>
            {tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}