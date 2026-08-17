"use client";

import Link from "next/link";
import { useCallback, useEffect, useId } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  learnerGuideBodyKey,
  learnerGuideCtaKey,
  learnerGuideTitleKey,
} from "@/lib/i18n/labels";
import {
  LEARNER_DATES_ANCHOR,
  type LearnerGuideContent,
} from "@/lib/learner/guides";

function scrollToLearnerDates() {
  const el = document.getElementById(LEARNER_DATES_ANCHOR);
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

export function LearnerGuideModal({
  guide,
  onAck,
}: {
  guide: LearnerGuideContent;
  onAck: (action: "dismiss" | "complete") => void;
}) {
  const titleId = useId();
  const bodyId = useId();
  const { t } = useLanguage();

  const complete = useCallback(() => {
    onAck("complete");
  }, [onAck]);

  const dismiss = useCallback(() => {
    onAck("dismiss");
  }, [onAck]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dismiss]);

  function onPrimaryClick() {
    if (guide.href?.includes(`#${LEARNER_DATES_ANCHOR}`)) {
      const onDashboard = window.location.pathname.startsWith("/dashboard");
      if (onDashboard && scrollToLearnerDates()) {
        complete();
        return;
      }
    }
    if (!guide.href) {
      complete();
    }
  }

  return (
    <div className="ko-guide-pop-root" role="presentation">
      <button
        type="button"
        className="ko-guide-pop-backdrop"
        aria-label={t("common.close")}
        onClick={dismiss}
      />
      <div
        className="ko-guide-pop-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <button
          type="button"
          className="ko-guide-pop-close"
          aria-label={t("common.close")}
          onClick={dismiss}
        >
          ×
        </button>
        <h2 id={titleId} className="ko-guide-pop-title">
          {t(learnerGuideTitleKey(guide.key))}
        </h2>
        <p id={bodyId} className="ko-guide-pop-body">
          {t(learnerGuideBodyKey(guide.key))}
        </p>
        {guide.href ? (
          <Link
            href={guide.href}
            className="ko-guide-pop-primary"
            onClick={(event) => {
              if (guide.href?.includes(`#${LEARNER_DATES_ANCHOR}`)) {
                const onDashboard =
                  window.location.pathname.startsWith("/dashboard");
                if (onDashboard && scrollToLearnerDates()) {
                  event.preventDefault();
                  complete();
                  return;
                }
              }
              complete();
            }}
          >
            {t(learnerGuideCtaKey(guide.key))}
          </Link>
        ) : (
          <button
            type="button"
            className="ko-guide-pop-primary"
            onClick={onPrimaryClick}
          >
            {t(learnerGuideCtaKey(guide.key))}
          </button>
        )}
      </div>
    </div>
  );
}
