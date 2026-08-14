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
    <section
      className="overflow-hidden rounded-[1.35rem] border border-blue-100 bg-white"
      aria-label="Explication du score de préparation"
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/80 sm:px-5"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-extrabold text-blue-700"
          aria-hidden
        >
          ?
        </span>
        <span className="ko-display flex-1 text-[0.95rem] font-bold text-blue-900">
          {trigger}
        </span>
        <span className="text-base font-bold text-slate-500" aria-hidden>
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div
          id={panelId}
          className="border-t border-slate-200 bg-[radial-gradient(circle_at_100%_0%,rgba(37,99,235,0.06),transparent_40%)] px-4 py-4 sm:px-5"
          role="region"
          aria-label={title}
        >
          <h3 className="ko-display text-lg font-extrabold tracking-tight text-slate-900">
            {title}
          </h3>

          {available ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Votre score est calculé à partir de plusieurs éléments. Les
                contributions indiquent la part de chaque facteur dans
                l&apos;estimation — ce ne sont pas des causes scientifiques.
              </p>

              {explanation.paceRedistributed ? (
                <p className="mt-3 rounded-xl bg-blue-50 px-3 py-2 text-sm text-blue-800">
                  Le rythme n&apos;était pas calculable : son poids a été
                  redistribué sur progression, QCM et régularité (règle moteur
                  existante).
                </p>
              ) : null}

              <ul className="mt-4 grid list-none gap-2.5 p-0">
                {explanation.factors.map((factor) => (
                  <li
                    key={factor.key}
                    className={`rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 ${
                      factor.excluded ? "opacity-75" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-extrabold text-slate-900">
                        {factor.label}
                      </span>
                      <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.06em] text-blue-600">
                        {factor.excluded
                          ? "Redistribué"
                          : `${factor.weightPercent} %`}
                      </span>
                    </div>
                    <p className="ko-display mt-1.5 text-[0.95rem] font-bold text-slate-800">
                      {factor.factorScore == null
                        ? "Non disponible"
                        : `${factor.factorScore} / 100`}
                      {factor.contributionPoints != null ? (
                        <span className="font-semibold text-slate-500">
                          {" "}
                          · Contribution : {factor.contributionPoints} pts
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                      {factor.detail}
                    </p>
                  </li>
                ))}
              </ul>

              {explanation.helps.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3.5 py-3">
                  <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.1em] text-slate-700">
                    Ce qui vous aide
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
                    {explanation.helps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {explanation.improve.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-orange-200 bg-orange-50 px-3.5 py-3">
                  <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.1em] text-slate-700">
                    À améliorer
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
                    {explanation.improve.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                KO Predict™ n&apos;affiche un score que lorsque les données
                minimales sont présentes. Une valeur manquante n&apos;est jamais
                un mauvais résultat.
              </p>
              <ul className="mt-4 grid list-none gap-2.5 p-0">
                {explanation.unavailableReasons.map((reason) => (
                  <li
                    key={reason}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-slate-700"
                  >
                    {reason}
                  </li>
                ))}
              </ul>
            </>
          )}

          <p className="mt-4 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-500">
            {explanation.disclaimer}
          </p>
        </div>
      ) : null}
    </section>
  );
}
