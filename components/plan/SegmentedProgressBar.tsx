const DEFAULT_SEGMENTS = 28;

/**
 * Barre de progression segmentée (pilules verticales).
 * percent null = objectif qualitatif : tous les segments neutres, label texte.
 */
export function SegmentedProgressBar({
  percent,
  label,
  segments = DEFAULT_SEGMENTS,
  className = "",
}: {
  percent: number | null;
  label: string;
  segments?: number;
  className?: string;
}) {
  const isQualitative = percent == null;
  const clamped = isQualitative
    ? 0
    : Math.min(100, Math.max(0, Math.round(percent)));
  const filled = isQualitative
    ? 0
    : Math.round((clamped / 100) * segments);

  return (
    <div
      className={`ko-seg-progress${isQualitative ? " is-qualitative" : ""}${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={
        isQualitative ? label : `Progression ${clamped} pour cent`
      }
    >
      <div className="ko-seg-track" aria-hidden>
        {Array.from({ length: segments }, (_, i) => {
          const active = i < filled;
          const t = segments <= 1 ? 0 : i / (segments - 1);
          return (
            <span
              key={i}
              className={`ko-seg-pill${active ? " is-filled" : ""}`}
              style={
                active
                  ? {
                      background: `linear-gradient(180deg, ${lerpGreen(t)} 0%, ${lerpGreenDeep(t)} 100%)`,
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
      <span className="ko-seg-label">{label}</span>
    </div>
  );
}

function lerpGreen(t: number): string {
  // jaune-vert → vert saturé
  const r = Math.round(163 + (34 - 163) * t);
  const g = Math.round(230 + (197 - 230) * t);
  const b = Math.round(53 + (94 - 53) * t);
  return `rgb(${r},${g},${b})`;
}

function lerpGreenDeep(t: number): string {
  const r = Math.round(132 + (21 - 132) * t);
  const g = Math.round(204 + (128 - 204) * t);
  const b = Math.round(22 + (61 - 22) * t);
  return `rgb(${r},${g},${b})`;
}
