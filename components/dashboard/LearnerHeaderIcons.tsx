import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { className?: string };

export function Icon3dBell({ className = "ko-header-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <radialGradient id="ko3d-bell-body" cx="35%" cy="28%" r="72%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="45%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <linearGradient id="ko3d-bell-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-bell-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2.8" stdDeviation="2" floodColor="#92400e" floodOpacity="0.32" />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="14" ry="3.8" fill="#92400e" opacity="0.16" />
      <g filter="url(#ko3d-bell-shadow)">
        <path
          d="M32 12c-8.5 0-14 6.2-14 14.5v6.2c0 2.2-.8 4.3-2.2 6L13 43.5c-.7.8-.1 2.1 1 2.1h36c1.1 0 1.7-1.3 1-2.1L48.2 38.7c-1.4-1.7-2.2-3.8-2.2-6v-6.2C46 18.2 40.5 12 32 12Z"
          fill="url(#ko3d-bell-body)"
        />
        <ellipse cx="25" cy="22" rx="7" ry="4" fill="url(#ko3d-bell-shine)" />
        <path
          d="M28 48.5a4.2 4.2 0 0 0 8 0"
          fill="none"
          stroke="#92400e"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function Icon3dSearch({ className = "ko-header-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <radialGradient id="ko3d-search-ball" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1e40af" />
        </radialGradient>
        <linearGradient id="ko3d-search-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-search-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2.8" stdDeviation="2" floodColor="#1e3a8a" floodOpacity="0.3" />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="14" ry="3.8" fill="#1e3a8a" opacity="0.16" />
      <circle
        cx="28"
        cy="28"
        r="14"
        fill="url(#ko3d-search-ball)"
        filter="url(#ko3d-search-shadow)"
      />
      <ellipse cx="22" cy="22" rx="6" ry="3.5" fill="url(#ko3d-search-shine)" />
      <circle cx="28" cy="28" r="7" fill="none" stroke="#fff" strokeWidth="3.2" />
      <path
        d="M39 39 48 48"
        fill="none"
        stroke="#1e40af"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M39 39 48 48"
        fill="none"
        stroke="#93c5fd"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
