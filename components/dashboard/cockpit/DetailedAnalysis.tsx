"use client";

import { useState } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { LearnerStatRings } from "@/components/dashboard/LearnerStatRings";

interface DetailedAnalysisProps {
  readiness: number | null;
  probability: number | null;
  progress: number | null;
  currentPace: number | null;
  requiredPace: number | null;
}

export function DetailedAnalysis(props: DetailedAnalysisProps) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <section className="ko-cockpit-analysis" aria-labelledby="analysis-title">
      <div className="hidden lg:block">
        <p className="ko-cockpit-kicker mb-3" id="analysis-title">
            {t("learner.cockpit.detailed")}
        </p>
        <LearnerStatRings
          readiness={props.readiness}
          probability={props.probability}
          progress={props.progress}
          currentPace={props.currentPace}
          requiredPace={props.requiredPace}
        />
      </div>

      <div className="lg:hidden">
        <button
          type="button"
          className="ko-cockpit-accordion"
          aria-expanded={open}
          aria-controls="analysis-panel"
          onClick={() => setOpen((v) => !v)}
        >
          <span>
            <span className="ko-cockpit-kicker block">
              {t("learner.cockpit.detailed")}
            </span>
            <span className="text-sm font-semibold text-slate-700">
              {t("learner.cockpit.seeDetailed")}
            </span>
          </span>
          <span className="ko-cockpit-accordion-icon" aria-hidden>
            {open ? "−" : "+"}
          </span>
        </button>
        {open ? (
          <div id="analysis-panel" className="mt-3">
            <LearnerStatRings
              readiness={props.readiness}
              probability={props.probability}
              progress={props.progress}
              currentPace={props.currentPace}
              requiredPace={props.requiredPace}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
