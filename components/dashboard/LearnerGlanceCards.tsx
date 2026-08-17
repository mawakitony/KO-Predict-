"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  IconBook,
  IconDashboard,
  IconUsers,
} from "@/components/admin/AdminIcons";

interface LearnerGlanceCardsProps {
  readiness: number | null;
  probability: number | null;
  progress: number | null;
  currentPace: number | null;
  requiredPace: number | null;
}

function useCountUp(target: number | null, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target == null) {
      setValue(0);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(target * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return target == null ? null : value;
}

function IconSpark({ className = "ko-icon" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden
    >
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="3.5" />
    </svg>
  );
}

function GlanceCard({
  label,
  value,
  unit,
  hint,
  badge,
  badgeTone = "up",
  icon,
  featured = false,
  empty = false,
  meter = 0,
}: {
  label: string;
  value: string;
  unit?: string;
  hint: string;
  badge: string;
  badgeTone?: "up" | "warn" | "neutral" | "wait";
  icon: ReactNode;
  featured?: boolean;
  empty?: boolean;
  meter?: number;
}) {
  const width = empty ? 16 : Math.max(8, Math.min(100, meter));

  return (
    <article
      className={`ko-dd-kpi ${featured ? "ko-dd-kpi-featured" : ""} ${
        empty ? "is-empty" : ""
      }`}
    >
      <div className="relative flex items-start justify-between gap-3">
        <span className={`ko-dd-kpi-icon ${featured ? "ko-dd-kpi-icon-on" : ""}`}>
          {icon}
        </span>
        <span className={`ko-dd-pill ko-dd-pill-${badgeTone}`}>{badge}</span>
      </div>

      <p className="ko-dd-kpi-label relative mt-4">{label}</p>
      <p className="ko-dd-kpi-value relative">
        {value}
        {unit && !empty ? (
          <span className="ko-dd-kpi-unit">{unit}</span>
        ) : null}
      </p>
      <p className="ko-dd-kpi-hint relative">{hint}</p>

      <div className="ko-dd-kpi-meter" aria-hidden>
        <div className="ko-dd-kpi-meter-fill" style={{ width: `${width}%` }} />
      </div>
    </article>
  );
}

/** Cartes KPI DealDeck — lisibles même sans données. */
export function LearnerGlanceCards({
  readiness,
  probability,
  progress,
  currentPace,
  requiredPace,
}: LearnerGlanceCardsProps) {
  const { t } = useLanguage();
  const paceReady = currentPace != null && currentPace > 0;
  const paceGap =
    paceReady && requiredPace != null ? currentPace - requiredPace : null;

  const readinessAnim = useCountUp(readiness);
  const probabilityAnim = useCountUp(probability);
  const progressAnim = useCountUp(progress);
  const paceAnim = useCountUp(paceReady ? currentPace : null);

  const paceMeter =
    paceReady && requiredPace != null && requiredPace > 0
      ? Math.min(100, (currentPace / requiredPace) * 100)
      : paceReady
        ? 55
        : 0;

  return (
    <section aria-label={t("admin.file.keyIndicators")} className="ko-dd-kpi-grid">
      <GlanceCard
        featured
        empty={readiness == null}
        label={t("admin.file.preparation")}
        value={
          readinessAnim != null ? String(Math.round(readinessAnim)) : "—"
        }
        unit="/100"
        hint={
          readiness == null
            ? t("learner.glance.collectingEstimate")
            : t("learner.glance.currentLevel")
        }
        badge={
          readiness != null
            ? t("learner.glance.pts", { n: Math.round(readiness) })
            : t("learner.glance.collecting")
        }
        badgeTone={
          readiness == null
            ? "wait"
            : readiness >= 70
              ? "up"
              : "warn"
        }
        meter={readiness ?? 0}
        icon={<IconSpark className="ko-icon" />}
      />
      <GlanceCard
        empty={probability == null}
        label={t("admin.file.probability")}
        value={
          probabilityAnim != null
            ? String(Math.round(probabilityAnim))
            : "—"
        }
        unit="%"
        hint={
          probability == null
            ? t("learner.glance.afterQcm")
            : t("learner.glance.readyChance")
        }
        badge={
          probability == null
            ? t("learner.glance.collecting")
            : probability >= 60
              ? t("learner.glance.favorable")
              : t("risk.amber")
        }
        badgeTone={
          probability == null
            ? "wait"
            : probability >= 60
              ? "up"
              : "warn"
        }
        meter={probability ?? 0}
        icon={<IconDashboard className="ko-icon" />}
      />
      <GlanceCard
        empty={progress == null}
        label={t("admin.file.progress")}
        value={
          progressAnim != null ? String(Math.round(progressAnim)) : "—"
        }
        unit="%"
        hint={
          progress == null
            ? t("learner.glance.progressPending")
            : t("learner.glance.progressHint")
        }
        badge={
          progress != null
            ? t("learner.glance.donePct", { value: Math.round(progress) })
            : t("learner.glance.collecting")
        }
        badgeTone={progress == null ? "wait" : "neutral"}
        meter={progress ?? 0}
        icon={<IconBook className="ko-icon" />}
      />
      <GlanceCard
        empty={!paceReady}
        label={t("admin.file.activityPace")}
        value={paceAnim != null ? String(Math.round(paceAnim * 10) / 10) : "—"}
        unit={t("learner.unitPerWeek")}
        hint={
          !paceReady
            ? requiredPace != null
              ? t("learner.glance.targetWeek", { n: requiredPace })
              : t("learner.glance.activitiesWeek")
            : requiredPace != null
              ? t("learner.glance.objectiveWeek", { n: requiredPace })
              : t("learner.glance.activitiesWeek")
        }
        badge={
          !paceReady
            ? t("learner.glance.collecting")
            : paceGap == null
              ? t("learner.kpi.ok")
              : paceGap >= 0
                ? `+${Math.round(paceGap * 10) / 10}`
                : `${Math.round(paceGap * 10) / 10}`
        }
        badgeTone={
          !paceReady ? "wait" : paceGap != null && paceGap >= 0 ? "up" : "warn"
        }
        meter={paceMeter}
        icon={<IconUsers className="ko-icon" />}
      />
    </section>
  );
}
