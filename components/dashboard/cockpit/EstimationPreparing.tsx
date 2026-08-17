"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

interface EstimationPreparingProps {
  tips: string[];
  explanations: string[];
}

export function EstimationPreparing({
  tips,
  explanations,
}: EstimationPreparingProps) {
  const { t } = useLanguage();
  return (
    <section
      className="ko-cockpit-card ko-cockpit-preparing"
      aria-labelledby="preparing-title"
    >
      <p className="ko-cockpit-kicker is-accent" id="preparing-title">
        {t("learner.status.preparing")}
      </p>
      <h2 className="ko-cockpit-preparing-title">
        {t("learner.heroUnavailable")}
      </h2>
      <p className="ko-cockpit-muted mt-2 max-w-2xl">
        {t("learner.cockpit.preparingBody")}
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
          <p className="ko-cockpit-why-label">
            {t("learner.cockpit.improveTips")}
          </p>
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
