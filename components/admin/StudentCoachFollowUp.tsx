"use client";

import { Icon3dCoach } from "@/components/learning/Learning3dIcons";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { formatDate, formatDateTime } from "@/lib/i18n/format-date";
import {
  interventionReasonKey,
  interventionStatusKey,
} from "@/lib/i18n/labels";
import type { CoachInterventionRecord } from "@/lib/admin/interventions/types";

export function StudentCoachFollowUp({
  interventions,
}: {
  interventions: CoachInterventionRecord[];
}) {
  const { t, locale } = useLanguage();

  return (
    <section
      className="ko-learn-panel"
      aria-labelledby="coach-followup-title"
    >
      <div className="ko-learn-panel-head">
        <div className="ko-learn-panel-title-row">
          <span className="ko-learn-card-icon" aria-hidden>
            <Icon3dCoach className="ko-learn-3d is-sm" />
          </span>
          <div>
            <h2 id="coach-followup-title" className="ko-learn-panel-title">
              {t("admin.file.coachFollow")}
            </h2>
            <p className="ko-learn-panel-sub">
              {t("admin.interventions.followSub")}
            </p>
          </div>
        </div>
      </div>

      {interventions.length === 0 ? (
        <p className="ko-learn-empty">
          {t("admin.interventions.emptyFollow")}
        </p>
      ) : (
        <ol className="ko-learn-list">
          {interventions.map((item) => (
            <li key={item.id} className="ko-learn-card">
              <div className="ko-learn-card-icon">
                <Icon3dCoach />
              </div>
              <div className="ko-learn-card-body">
                <p className="ko-learn-card-title">
                  {t(interventionStatusKey(item.status))}
                  {item.riskLevel ? ` · ${item.riskLevel}` : ""}
                </p>
                <p className="ko-learn-card-meta">
                  {t("admin.interventions.openedOn", {
                    date: formatDate(item.createdAt.slice(0, 10), locale),
                  })}
                  {" · "}
                  {item.reasons
                    .map((code) => t(interventionReasonKey(code)))
                    .join(" · ") || t("admin.interventions.reasonUnknown")}
                </p>
                <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
                  <li>
                    {formatDateTime(item.createdAt, locale)} —{" "}
                    {t("admin.interventions.cycleOpened")}
                  </li>
                  {item.contactedAt ? (
                    <li>
                      {formatDateTime(item.contactedAt, locale)} —{" "}
                      {t("admin.interventions.contactedFollow")}
                    </li>
                  ) : null}
                  {item.resolvedAt ? (
                    <li>
                      {formatDateTime(item.resolvedAt, locale)} —{" "}
                      {t("admin.interventions.interventionDone")}
                    </li>
                  ) : null}
                </ul>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
