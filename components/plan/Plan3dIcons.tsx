import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { className?: string };

/** Badge check 3D (progression). */
export function Icon3dCheck({ className = "ko-plan-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <radialGradient id="ko3d-chk-ball" cx="32%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#86efac" />
          <stop offset="45%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </radialGradient>
        <linearGradient id="ko3d-chk-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-chk-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="2.2"
            floodColor="#14532d"
            floodOpacity="0.35"
          />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="16" ry="4.5" fill="#14532d" opacity="0.18" />
      <circle
        cx="32"
        cy="30"
        r="20"
        fill="url(#ko3d-chk-ball)"
        filter="url(#ko3d-chk-shadow)"
      />
      <ellipse cx="24" cy="22" rx="9" ry="5.5" fill="url(#ko3d-chk-shine)" />
      <path
        d="M22.5 30.2 28.8 36.4 41.5 23.8"
        fill="none"
        stroke="#fff"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.5 30.2 28.8 36.4 41.5 23.8"
        fill="none"
        stroke="#bbf7d0"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

/** Graphique barres 3D (activités). */
export function Icon3dActivity({ className = "ko-plan-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <linearGradient id="ko3d-act-b1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="ko3d-act-b2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="ko3d-act-b3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id="ko3d-act-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.05" />
        </linearGradient>
        <filter id="ko3d-act-shadow" x="-25%" y="-15%" width="150%" height="150%">
          <feDropShadow
            dx="0"
            dy="2.5"
            stdDeviation="2"
            floodColor="#1e3a8a"
            floodOpacity="0.3"
          />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="18" ry="4.2" fill="#1e3a8a" opacity="0.16" />
      <g filter="url(#ko3d-act-shadow)">
        <rect x="12" y="30" width="10" height="20" rx="2.5" fill="url(#ko3d-act-b1)" />
        <rect x="12" y="30" width="10" height="5" rx="2.5" fill="url(#ko3d-act-top)" />
        <rect x="27" y="18" width="10" height="32" rx="2.5" fill="url(#ko3d-act-b2)" />
        <rect x="27" y="18" width="10" height="5" rx="2.5" fill="url(#ko3d-act-top)" />
        <rect x="42" y="24" width="10" height="26" rx="2.5" fill="url(#ko3d-act-b3)" />
        <rect x="42" y="24" width="10" height="5" rx="2.5" fill="url(#ko3d-act-top)" />
      </g>
    </svg>
  );
}

/** Horloge 3D (jours restants). */
export function Icon3dClock({ className = "ko-plan-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <radialGradient id="ko3d-clk-face" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <radialGradient id="ko3d-clk-inner" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#fffbeb" />
          <stop offset="100%" stopColor="#fde68a" />
        </radialGradient>
        <linearGradient id="ko3d-clk-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-clk-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="2.2"
            floodColor="#92400e"
            floodOpacity="0.35"
          />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="16" ry="4.5" fill="#92400e" opacity="0.18" />
      <circle
        cx="32"
        cy="30"
        r="20"
        fill="url(#ko3d-clk-face)"
        filter="url(#ko3d-clk-shadow)"
      />
      <circle cx="32" cy="30" r="14.5" fill="url(#ko3d-clk-inner)" />
      <ellipse cx="24" cy="22" rx="8" ry="5" fill="url(#ko3d-clk-shine)" />
      <circle cx="32" cy="30" r="2.2" fill="#92400e" />
      <path
        d="M32 22.5v8.2l6.2 3.4"
        fill="none"
        stroke="#92400e"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M32 22.5v8.2l6.2 3.4"
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}

/** Cible 3D (rythme). */
export function Icon3dTarget({ className = "ko-plan-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <radialGradient id="ko3d-tgt-ring" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="50%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#be123c" />
        </radialGradient>
        <radialGradient id="ko3d-tgt-mid" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#fecdd3" />
        </radialGradient>
        <radialGradient id="ko3d-tgt-core" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#fb7185" />
          <stop offset="100%" stopColor="#e11d48" />
        </radialGradient>
        <linearGradient id="ko3d-tgt-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-tgt-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="2.2"
            floodColor="#9f1239"
            floodOpacity="0.35"
          />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="16" ry="4.5" fill="#9f1239" opacity="0.18" />
      <g filter="url(#ko3d-tgt-shadow)">
        <circle cx="32" cy="30" r="20" fill="url(#ko3d-tgt-ring)" />
        <circle cx="32" cy="30" r="13.5" fill="url(#ko3d-tgt-mid)" />
        <circle cx="32" cy="30" r="7.2" fill="url(#ko3d-tgt-core)" />
      </g>
      <ellipse cx="24" cy="22" rx="8.5" ry="5" fill="url(#ko3d-tgt-shine)" />
      <circle cx="32" cy="30" r="2.4" fill="#fff" opacity="0.9" />
    </svg>
  );
}

/** Etincelle / plan 3D. */
export function Icon3dSpark({ className = "ko-plan-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <radialGradient id="ko3d-spk-gem" cx="35%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#99f6e4" />
          <stop offset="45%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0f766e" />
        </radialGradient>
        <linearGradient id="ko3d-spk-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-spk-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow
            dx="0"
            dy="3"
            stdDeviation="2.2"
            floodColor="#115e59"
            floodOpacity="0.35"
          />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="15" ry="4.2" fill="#115e59" opacity="0.18" />
      <g filter="url(#ko3d-spk-shadow)">
        <path
          d="M32 8.5 37.2 24.8 54 30 37.2 35.2 32 51.5 26.8 35.2 10 30 26.8 24.8Z"
          fill="url(#ko3d-spk-gem)"
        />
      </g>
      <ellipse cx="27" cy="24" rx="7" ry="4" fill="url(#ko3d-spk-shine)" />
      <circle cx="38" cy="28" r="2.2" fill="#fff" opacity="0.75" />
    </svg>
  );
}

/** Calendrier 3D. */
export function Icon3dCalendar({ className = "ko-plan-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <linearGradient id="ko3d-cal-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="ko3d-cal-head" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
        <linearGradient id="ko3d-cal-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-cal-shadow" x="-25%" y="-15%" width="150%" height="150%">
          <feDropShadow
            dx="0"
            dy="2.8"
            stdDeviation="2"
            floodColor="#0c4a6e"
            floodOpacity="0.28"
          />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="16" ry="4" fill="#0c4a6e" opacity="0.16" />
      <g filter="url(#ko3d-cal-shadow)">
        <rect x="12" y="14" width="40" height="36" rx="7" fill="url(#ko3d-cal-body)" />
        <rect x="12" y="14" width="40" height="12" rx="7" fill="url(#ko3d-cal-head)" />
        <rect x="12" y="20" width="40" height="6" fill="url(#ko3d-cal-head)" />
        <rect x="12" y="14" width="40" height="5" rx="7" fill="url(#ko3d-cal-shine)" />
      </g>
      <circle cx="22" cy="19" r="2.1" fill="#e0f2fe" />
      <circle cx="42" cy="19" r="2.1" fill="#e0f2fe" />
      <rect x="20" y="30" width="7" height="6" rx="1.5" fill="#38bdf8" opacity="0.85" />
      <rect x="29" y="30" width="7" height="6" rx="1.5" fill="#0ea5e9" />
      <rect x="38" y="30" width="7" height="6" rx="1.5" fill="#bae6fd" />
      <rect x="20" y="39" width="7" height="6" rx="1.5" fill="#bae6fd" />
      <rect x="29" y="39" width="7" height="6" rx="1.5" fill="#7dd3fc" />
    </svg>
  );
}
