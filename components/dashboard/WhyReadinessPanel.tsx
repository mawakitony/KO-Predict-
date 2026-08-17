"use client";

import { useId, useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { ReadinessExplanation } from "@/lib/prediction/explanation";

export function WhyReadinessPanel({
  explanation,
}: {
  explanation: ReadinessExplanation;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  const available = explanation.mode === "available";
  const title = available
    ? t("learner.why.scoreTitle", {
        score: explanation.readinessScore ?? "—",
      })
    : t("learner.why.unavailableTitle");
  const trigger = available
    ? t("learner.why.scoreTrigger")
    : t("learner.estimationTitle");

  return (
    <section className="ko-why-panel" aria-label={t("learner.why.aria")}>
      <button
        type="button"
        className="ko-why-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="ko-why-q" aria-hidden>
          ?
        </span>
        <span className="ko-why-trigger-label">{trigger}</span>
        <span className="ko-why-plus" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="ko-why-body"
          role="region"
          aria-label={title}
        >
          <h3 className="ko-why-title">{title}</h3>

          {available ? (
            <>
              <p className="ko-why-lead">{t("learner.why.scoreLead")}</p>

              {explanation.paceRedistributed ? (
                <p className="ko-why-note">{t("learner.why.paceRedistributed")}</p>
              ) : null}

              <ul className="ko-why-factors">
                {explanation.factors.map((factor) => (
                  <li
                    key={factor.key}
                    className={`ko-why-factor${factor.excluded ? " is-excluded" : ""}`}
                  >
                    <div className="ko-why-factor-top">
                      <span>{factor.label}</span>
                      <span>
                        {factor.excluded
                          ? t("learner.why.redistributed")
                          : `${factor.weightPercent} %`}
                      </span>
                    </div>
                    <p className="ko-why-factor-score">
                      {factor.factorScore == null
                        ? t("learner.why.unavailable")
                        : `${factor.factorScore} / 100`}
                      {factor.contributionPoints != null ? (
                        <span>
                          {" "}
                          · {t("learner.why.contribution", {
                            pts: factor.contributionPoints,
                          })}
                        </span>
                      ) : null}
                    </p>
                    <p className="ko-why-factor-detail">{factor.detail}</p>
                  </li>
                ))}
              </ul>

              {explanation.helps.length > 0 ? (
                <div className="ko-why-callout is-help">
                  <p>{t("learner.why.helps")}</p>
                  <ul>
                    {explanation.helps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {explanation.improve.length > 0 ? (
                <div className="ko-why-callout is-improve">
                  <p>{t("learner.why.improve")}</p>
                  <ul>
                    {explanation.improve.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="ko-why-lead">{t("learner.why.unavailableLead")}</p>
              <ul className="ko-why-factors">
                {explanation.unavailableReasons.map((reason) => (
                  <li key={reason} className="ko-why-factor">
                    <p className="ko-why-factor-detail is-solo">{reason}</p>
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="ko-why-disclaimer">{explanation.disclaimer}</p>
        </div>
      ) : null}
    </section>
  );
}
