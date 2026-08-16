"use client";

import { useId, useState } from "react";
import type { ReadinessExplanation } from "@/lib/prediction/explanation";

export function WhyReadinessPanel({
  explanation,
}: {
  explanation: ReadinessExplanation;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const available = explanation.mode === "available";
  const title = available
    ? `Pourquoi ${explanation.readinessScore} / 100 ?`
    : "Pourquoi l’estimation n’est-elle pas encore disponible ?";
  const trigger = available
    ? "Pourquoi ce score ?"
    : "Pourquoi l’estimation n’est pas encore disponible ?";

  return (
    <section className="ko-why-panel" aria-label="Explication du score de préparation">
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
              <p className="ko-why-lead">
                Votre score est calculé à partir de plusieurs éléments. Les
                contributions indiquent la part de chaque facteur dans
                l&apos;estimation — ce ne sont pas des causes scientifiques.
              </p>

              {explanation.paceRedistributed ? (
                <p className="ko-why-note">
                  Le rythme n&apos;était pas calculable : son poids a été
                  redistribué sur progression, QCM et régularité.
                </p>
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
                          ? "Redistribué"
                          : `${factor.weightPercent} %`}
                      </span>
                    </div>
                    <p className="ko-why-factor-score">
                      {factor.factorScore == null
                        ? "Non disponible"
                        : `${factor.factorScore} / 100`}
                      {factor.contributionPoints != null ? (
                        <span>
                          {" "}
                          · Contribution : {factor.contributionPoints} pts
                        </span>
                      ) : null}
                    </p>
                    <p className="ko-why-factor-detail">{factor.detail}</p>
                  </li>
                ))}
              </ul>

              {explanation.helps.length > 0 ? (
                <div className="ko-why-callout is-help">
                  <p>Ce qui vous aide</p>
                  <ul>
                    {explanation.helps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {explanation.improve.length > 0 ? (
                <div className="ko-why-callout is-improve">
                  <p>À améliorer</p>
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
              <p className="ko-why-lead">
                KO Predict™ n&apos;affiche un score que lorsque les données
                minimales sont présentes. Une valeur manquante n&apos;est jamais
                un mauvais résultat.
              </p>
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
