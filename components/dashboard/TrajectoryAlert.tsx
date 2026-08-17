"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

interface TrajectoryAlertProps {
  headline: string | null;
  paceHint: string | null;
  postponed: boolean;
  advanced: boolean;
  readinessDaysDelta?: number | null;
  currentPace?: number | null;
  requiredPace?: number | null;
}

function IconTrendDown() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
      <path
        d="M4 8.5 10.2 14l3.3-3.2L20 16.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 16.5H20V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrendUp() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
      <path
        d="M4 15.5 10.2 10l3.3 3.2L20 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.5 7.5H20V13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPath() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
      <path
        d="M5 17c2.5-6 5.5-9 9-9 2.2 0 3.8 1.2 5 3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="5" cy="17" r="1.6" fill="currentColor" />
      <circle cx="19" cy="11" r="1.6" fill="currentColor" />
    </svg>
  );
}

function formatPace(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function TrajectoryAlert({
  headline,
  paceHint,
  postponed,
  advanced,
  readinessDaysDelta = null,
  currentPace = null,
  requiredPace = null,
}: TrajectoryAlertProps) {
  const { t } = useLanguage();
  if (!headline) return null;

  const tone = postponed ? "warn" : advanced ? "good" : "neutral";
  const delta =
    readinessDaysDelta != null && readinessDaysDelta !== 0
      ? Math.abs(readinessDaysDelta)
      : null;

  const showPace =
    postponed &&
    currentPace != null &&
    requiredPace != null &&
    requiredPace > 0;

  const paceMax = showPace
    ? Math.max(currentPace!, requiredPace!, 1)
    : 1;
  const currentWidth = showPace
    ? Math.round((currentPace! / paceMax) * 100)
    : 0;
  const requiredWidth = showPace
    ? Math.round((requiredPace! / paceMax) * 100)
    : 0;

  return (
    <section
      className={`ko-traj-card is-${tone}`}
      aria-live="polite"
      aria-labelledby="traj-title"
    >
      <div className="ko-traj-glow" aria-hidden />
      <div className="ko-traj-orbit" aria-hidden />

      <div className="ko-traj-main">
        <div className="ko-traj-top">
          <span className="ko-traj-icon">
            {postponed ? (
              <IconTrendDown />
            ) : advanced ? (
              <IconTrendUp />
            ) : (
              <IconPath />
            )}
          </span>

          <div className="min-w-0 flex-1">
            <div className="ko-traj-kicker-row">
              <p className="ko-traj-kicker">{t("learner.traj.kicker")}</p>
              {delta != null ? (
                <span className="ko-traj-badge">
                  {postponed ? "+" : "−"}
                  {t("learner.traj.daysShort", { n: delta })}
                </span>
              ) : null}
            </div>

            <h2 id="traj-title" className="ko-traj-title">
              {headline}
            </h2>

            {paceHint ? <p className="ko-traj-body">{paceHint}</p> : null}
          </div>
        </div>

        {showPace ? (
          <div className="ko-traj-meters" aria-label={t("learner.traj.paceCompare")}>
            <div className="ko-traj-meter">
              <div className="ko-traj-meter-head">
                <span>{t("learner.traj.currentPace")}</span>
                <strong>
                  {formatPace(currentPace!)} {t("learner.traj.perWeek")}
                </strong>
              </div>
              <div className="ko-traj-meter-track">
                <div
                  className="ko-traj-meter-fill is-current"
                  style={{ width: `${currentWidth}%` }}
                />
              </div>
            </div>
            <div className="ko-traj-meter">
              <div className="ko-traj-meter-head">
                <span>{t("learner.traj.targetPace")}</span>
                <strong>
                  {formatPace(requiredPace!)} {t("learner.traj.perWeek")}
                </strong>
              </div>
              <div className="ko-traj-meter-track">
                <div
                  className="ko-traj-meter-fill is-target"
                  style={{ width: `${requiredWidth}%` }}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
