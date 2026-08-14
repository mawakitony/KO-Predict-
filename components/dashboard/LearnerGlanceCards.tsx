"use client";

import { useEffect, useState, type ReactNode } from "react";
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
    <section aria-label="Indicateurs clés" className="ko-dd-kpi-grid">
      <GlanceCard
        featured
        empty={readiness == null}
        label="Préparation"
        value={
          readinessAnim != null ? String(Math.round(readinessAnim)) : "—"
        }
        unit="/100"
        hint={
          readiness == null
            ? "Estimation en cours de collecte"
            : "Niveau actuel de préparation"
        }
        badge={readiness != null ? `${Math.round(readiness)} pts` : "En collecte"}
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
        label="Probabilité"
        value={
          probabilityAnim != null
            ? String(Math.round(probabilityAnim))
            : "—"
        }
        unit="%"
        hint={
          probability == null
            ? "Disponible après les premiers QCM"
            : "Chance d'être prêt à la date cible"
        }
        badge={
          probability == null
            ? "En collecte"
            : probability >= 60
              ? "Favorable"
              : "À surveiller"
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
        label="Progression"
        value={
          progressAnim != null ? String(Math.round(progressAnim)) : "—"
        }
        unit="%"
        hint={
          progress == null
            ? "Avancement pas encore mesuré"
            : "Avancement dans la formation"
        }
        badge={
          progress != null ? `${Math.round(progress)}% fait` : "En collecte"
        }
        badgeTone={progress == null ? "wait" : "neutral"}
        meter={progress ?? 0}
        icon={<IconBook className="ko-icon" />}
      />
      <GlanceCard
        empty={!paceReady}
        label="Rythme"
        value={paceAnim != null ? String(Math.round(paceAnim * 10) / 10) : "—"}
        unit="/sem."
        hint={
          !paceReady
            ? requiredPace != null
              ? `Objectif à viser : ${requiredPace} / semaine`
              : "Activités par semaine"
            : requiredPace != null
              ? `Objectif ${requiredPace} activités / semaine`
              : "Activités par semaine"
        }
        badge={
          !paceReady
            ? "En collecte"
            : paceGap == null
              ? "OK"
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
