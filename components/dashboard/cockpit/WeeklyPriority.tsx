"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

interface WeeklyPriorityProps {
  action: string;
  why: string | null;
}

export function WeeklyPriority({ action, why }: WeeklyPriorityProps) {
  const { t } = useLanguage();
  return (
    <section
      className="ko-cockpit-card ko-cockpit-priority"
      aria-labelledby="priority-title"
    >
      <p className="ko-cockpit-kicker is-accent" id="priority-title">
        {t("learner.cockpit.priority")}
      </p>
      <p className="ko-cockpit-priority-action">{action}</p>
      {why ? (
        <div className="ko-cockpit-why">
          <p className="ko-cockpit-why-label">{t("learner.cockpit.why")}</p>
          <p className="ko-cockpit-why-text">{why}</p>
        </div>
      ) : null}
    </section>
  );
}
