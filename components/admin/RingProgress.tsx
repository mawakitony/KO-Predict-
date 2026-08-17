"use client";

import { useId, type ReactNode } from "react";

export type RingTone = "emerald" | "amber" | "sky";

interface RingProgressProps {
  value: number | null;
  label: string;
  tone?: RingTone;
  size?: number;
  /** Affiche un motif hachuré sur la fin de l’arc (effet “warning / actif”). */
  striped?: boolean;
  suffix?: string;
}

const TONE_STOPS: Record<
  RingTone,
  { from: string; to: string; glow: string }
> = {
  emerald: { from: "var(--success)", to: "var(--accent)", glow: "color-mix(in srgb, var(--success) 28%, transparent)" },
  amber: { from: "var(--warning)", to: "#facc15", glow: "color-mix(in srgb, var(--warning) 28%, transparent)" },
  sky: { from: "var(--info)", to: "#38bdf8", glow: "color-mix(in srgb, var(--info) 28%, transparent)" },
};

/** Anneau style jauge (disque ombré + dégradé + option hachures). */
export function RingProgress({
  value,
  label,
  tone = "emerald",
  size = 112,
  striped = false,
  suffix = "%",
}: RingProgressProps) {
  const uid = useId().replace(/:/g, "");
  const gradId = `ring-grad-${uid}`;
  const stripeId = `ring-stripe-${uid}`;
  const filterId = `ring-soft-${uid}`;

  const stroke = 12;
  const r = (size - stroke * 2) / 2;
  const c = 2 * Math.PI * r;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const offset = c - (pct / 100) * c;
  const stops = TONE_STOPS[tone];

  /** Segment hachuré = dernier quart de la progression (si > 50 %). */
  const stripeStartPct = Math.max(50, pct * 0.66);
  const stripeLen = striped && pct > 50 ? ((pct - stripeStartPct) / 100) * c : 0;
  const stripeOffset = c - (pct / 100) * c;

  return (
    <div className="flex w-full max-w-[8.5rem] flex-col items-center gap-3 px-1">
      <div
        className="relative flex shrink-0 items-center justify-center rounded-full bg-white"
        style={{
          width: size + 16,
          height: size + 16,
          boxShadow:
            "0 10px 28px -8px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(148, 163, 184, 0.25)",
        }}
      >
        <div
          className="absolute inset-2 rounded-full"
          style={{
            boxShadow: `inset 0 1px 2px rgba(255,255,255,0.9), 0 0 0 1px rgba(226,232,240,0.8), 0 0 24px ${stops.glow}`,
          }}
        />
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="relative -rotate-90"
          aria-hidden
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={stops.from} />
              <stop offset="55%" stopColor={stops.to} />
              <stop offset="100%" stopColor={stops.to} stopOpacity="0.85" />
            </linearGradient>
            <pattern
              id={stripeId}
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(42)"
            >
              <rect width="7" height="7" fill={`url(#${gradId})`} />
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="7"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="2.5"
              />
            </pattern>
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="1"
                stdDeviation="1.2"
                floodColor={stops.from}
                floodOpacity="0.35"
              />
            </filter>
          </defs>

          {/* Piste */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
          />

          {/* Progression dégradée */}
          {pct > 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={offset}
              filter={`url(#${filterId})`}
            />
          ) : null}

          {/* Fin d’arc hachurée */}
          {stripeLen > 0 ? (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={`url(#${stripeId})`}
              strokeWidth={stroke}
              strokeLinecap="butt"
              strokeDasharray={`${stripeLen} ${c - stripeLen}`}
              strokeDashoffset={stripeOffset}
            />
          ) : null}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="ko-display text-xl font-bold tracking-tight text-slate-800 sm:text-[1.45rem]">
            {value == null ? "—" : `${Math.round(value)}${suffix}`}
          </span>
        </div>
      </div>
      <p className="max-w-[9rem] text-center text-sm font-medium text-slate-600">
        {label}
      </p>
    </div>
  );
}

/** Rangée de jauges : 2 en haut, 1 centrée en bas. */
export function RingProgressRow({ children }: { children: ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  const [first, second, third, ...rest] = items;

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 py-2">
      <div className="grid w-full min-w-0 grid-cols-1 divide-y divide-slate-200/90 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        {[first, second].filter(Boolean).map((child, i) => (
          <div
            key={i}
            className="flex min-w-0 items-center justify-center px-2 py-4 sm:py-2"
          >
            {child}
          </div>
        ))}
      </div>
      {third ? (
        <div className="flex w-full justify-center border-t border-slate-200/90 pt-5">
          <div className="flex min-w-0 items-center justify-center px-2">
            {third}
          </div>
        </div>
      ) : null}
      {rest.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-4">
          {rest.map((child, i) => (
            <div key={`extra-${i}`}>{child}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
