"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { ReadinessHistoryPoint } from "@/lib/dashboard/types";

interface ReadinessHistoryProps {
  points: ReadinessHistoryPoint[];
}

export function ReadinessHistory({ points }: ReadinessHistoryProps) {
  const { t } = useLanguage();

  if (points.length < 2) {
    return (
      <section
        className="ko-cockpit-card"
        aria-labelledby="history-title"
      >
        <p className="ko-cockpit-kicker" id="history-title">
          {t("learner.cockpit.history")}
        </p>
        <p className="ko-cockpit-muted mt-2">{t("learner.cockpit.historySoon")}</p>
      </section>
    );
  }

  const scores = points.map((p) => p.readinessScore);
  const max = Math.max(...scores, 1);
  const first = scores[0]!;
  const last = scores[scores.length - 1]!;
  const delta = Math.round(last - first);
  const deltaLabel = delta > 0 ? `+${delta}` : String(delta);

  return (
    <section
      className="ko-cockpit-card"
      aria-labelledby="history-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="ko-cockpit-kicker" id="history-title">
            {t("learner.cockpit.history")}
          </p>
          <p className="ko-cockpit-history-chain" aria-label={t("learner.cockpit.scoresAria")}>
            {scores.map((s, i) => (
              <span key={`${s}-${i}`}>
                {i > 0 ? (
                  <span className="ko-cockpit-history-arrow" aria-hidden>
                    →
                  </span>
                ) : null}
                <strong>{Math.round(s)}</strong>
              </span>
            ))}
          </p>
        </div>
        <p
          className={`ko-cockpit-history-delta ${
            delta > 0 ? "is-up" : delta < 0 ? "is-down" : ""
          }`}
        >
          {t("learner.cockpit.ptsDelta", { delta: deltaLabel })}
        </p>
      </div>

      <div
        className="ko-cockpit-history-bars"
        role="img"
        aria-label={t("learner.cockpit.historyBarsAria", {
          first: Math.round(first),
          last: Math.round(last),
        })}
      >
        {scores.map((s, i) => (
          <div key={`bar-${i}`} className="ko-cockpit-history-bar-wrap">
            <div
              className="ko-cockpit-history-bar"
              style={{ height: `${Math.max(8, (s / max) * 100)}%` }}
            />
            <span>{Math.round(s)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
