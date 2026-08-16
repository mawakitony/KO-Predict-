import type { SVGProps } from "react";
import type { LearningActivityType } from "@/types/learning-history";

type Props = SVGProps<SVGSVGElement> & { className?: string };

/** Lecteur vidéo 3D. */
export function Icon3dVideo({ className = "ko-learn-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <linearGradient id="ko3d-vid-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="ko3d-vid-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="60%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-vid-shadow" x="-25%" y="-15%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2.8" stdDeviation="2" floodColor="#1e3a8a" floodOpacity="0.32" />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="16" ry="4" fill="#1e3a8a" opacity="0.16" />
      <g filter="url(#ko3d-vid-shadow)">
        <rect x="10" y="16" width="44" height="30" rx="8" fill="url(#ko3d-vid-body)" />
        <rect x="10" y="16" width="44" height="8" rx="8" fill="url(#ko3d-vid-shine)" />
        <path d="M28 24.5 40 31 28 37.5Z" fill="#fff" opacity="0.95" />
      </g>
    </svg>
  );
}

/** Document / PDF 3D. */
export function Icon3dDocument({ className = "ko-learn-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <linearGradient id="ko3d-doc-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="ko3d-doc-fold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <filter id="ko3d-doc-shadow" x="-25%" y="-15%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2.8" stdDeviation="2" floodColor="#334155" floodOpacity="0.28" />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="15" ry="4" fill="#334155" opacity="0.14" />
      <g filter="url(#ko3d-doc-shadow)">
        <path
          d="M18 12h20l10 10v28a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6V18a6 6 0 0 1 6-6Z"
          fill="url(#ko3d-doc-body)"
        />
        <path d="M38 12v8a2 2 0 0 0 2 2h8Z" fill="url(#ko3d-doc-fold)" />
        <rect x="20" y="28" width="20" height="2.5" rx="1.25" fill="#94a3b8" />
        <rect x="20" y="34" width="16" height="2.5" rx="1.25" fill="#cbd5e1" />
        <rect x="20" y="40" width="18" height="2.5" rx="1.25" fill="#cbd5e1" />
      </g>
    </svg>
  );
}

/** Quiz / examen 3D. */
export function Icon3dQuiz({ className = "ko-learn-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <radialGradient id="ko3d-quiz-ball" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <linearGradient id="ko3d-quiz-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-quiz-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#92400e" floodOpacity="0.35" />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="15" ry="4.2" fill="#92400e" opacity="0.18" />
      <circle
        cx="32"
        cy="30"
        r="19"
        fill="url(#ko3d-quiz-ball)"
        filter="url(#ko3d-quiz-shadow)"
      />
      <ellipse cx="24" cy="22" rx="8" ry="5" fill="url(#ko3d-quiz-shine)" />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        fill="#fff"
        fontSize="22"
        fontWeight="800"
        fontFamily="var(--font-outfit), ui-sans-serif, system-ui, sans-serif"
      >
        ?
      </text>
    </svg>
  );
}

/** Lien / autre 3D. */
export function Icon3dLink({ className = "ko-learn-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <radialGradient id="ko3d-link-ball" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#99f6e4" />
          <stop offset="50%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#0f766e" />
        </radialGradient>
        <linearGradient id="ko3d-link-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-link-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#115e59" floodOpacity="0.35" />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="15" ry="4.2" fill="#115e59" opacity="0.18" />
      <circle
        cx="32"
        cy="30"
        r="19"
        fill="url(#ko3d-link-ball)"
        filter="url(#ko3d-link-shadow)"
      />
      <ellipse cx="24" cy="22" rx="8" ry="5" fill="url(#ko3d-link-shine)" />
      <path
        d="M24.5 34.5 22 37a6 6 0 0 0 8.5 8.5l2.5-2.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M39.5 25.5 42 23a6 6 0 0 0-8.5-8.5L31 17"
        fill="none"
        stroke="#ccfbf1"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M28 36 36 28"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Actualiser 3D. */
export function Icon3dRefresh({ className = "ko-learn-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <radialGradient id="ko3d-ref-ball" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#5b21b6" />
        </radialGradient>
        <linearGradient id="ko3d-ref-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.8" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-ref-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#4c1d95" floodOpacity="0.35" />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="15" ry="4.2" fill="#4c1d95" opacity="0.16" />
      <circle
        cx="32"
        cy="30"
        r="19"
        fill="url(#ko3d-ref-ball)"
        filter="url(#ko3d-ref-shadow)"
      />
      <ellipse cx="24" cy="22" rx="8" ry="5" fill="url(#ko3d-ref-shine)" />
      <path
        d="M22 28a10 10 0 0 1 16.5-6.5"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M38 18.5v5.5h-5.5" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M42 32a10 10 0 0 1-16.5 6.5"
        fill="none"
        stroke="#ede9fe"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path d="M26 41.5V36H31.5" fill="none" stroke="#ede9fe" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function learningTypeIcon(type: LearningActivityType) {
  switch (type) {
    case "video":
    case "youtube":
      return Icon3dVideo;
    case "pdf":
      return Icon3dDocument;
    case "assessmentV2":
    case "newSurvey":
      return Icon3dQuiz;
    default:
      return Icon3dLink;
  }
}

/** Vue d’ensemble / tableau de bord 3D. */
export function Icon3dOverview({ className = "ko-learn-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <linearGradient id="ko3d-ov-b1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="ko3d-ov-b2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="ko3d-ov-b3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="ko3d-ov-shadow" x="-25%" y="-15%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2.8" stdDeviation="2" floodColor="#1e3a8a" floodOpacity="0.3" />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="16" ry="4" fill="#1e3a8a" opacity="0.14" />
      <g filter="url(#ko3d-ov-shadow)">
        <rect x="10" y="28" width="12" height="18" rx="3" fill="url(#ko3d-ov-b1)" />
        <rect x="26" y="18" width="12" height="28" rx="3" fill="url(#ko3d-ov-b2)" />
        <rect x="42" y="24" width="12" height="22" rx="3" fill="url(#ko3d-ov-b3)" />
      </g>
    </svg>
  );
}

/** Coach / suivi 3D. */
export function Icon3dCoach({ className = "ko-learn-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <radialGradient id="ko3d-coach-ball" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#5b21b6" />
        </radialGradient>
        <linearGradient id="ko3d-coach-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id="ko3d-coach-shadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#4c1d95" floodOpacity="0.35" />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="15" ry="4.2" fill="#4c1d95" opacity="0.16" />
      <circle
        cx="32"
        cy="30"
        r="19"
        fill="url(#ko3d-coach-ball)"
        filter="url(#ko3d-coach-shadow)"
      />
      <ellipse cx="24" cy="22" rx="8" ry="5" fill="url(#ko3d-coach-shine)" />
      <circle cx="32" cy="24" r="6.5" fill="#fff" opacity="0.95" />
      <path
        d="M20.5 40.5c2.2-6.2 6.4-9 11.5-9s9.3 2.8 11.5 9"
        fill="none"
        stroke="#fff"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Activités (barres) — alias compact pour onglets admin. */
export function Icon3dActivities({ className = "ko-learn-3d", ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden {...rest}>
      <defs>
        <linearGradient id="ko3d-acts-1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="ko3d-acts-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="ko3d-acts-3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfdbfe" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
        <filter id="ko3d-acts-shadow" x="-25%" y="-15%" width="150%" height="150%">
          <feDropShadow dx="0" dy="2.8" stdDeviation="2" floodColor="#1e3a8a" floodOpacity="0.3" />
        </filter>
      </defs>
      <ellipse cx="32" cy="54" rx="16" ry="4" fill="#1e3a8a" opacity="0.14" />
      <g filter="url(#ko3d-acts-shadow)">
        <rect x="12" y="30" width="11" height="16" rx="3" fill="url(#ko3d-acts-1)" />
        <rect x="26.5" y="18" width="11" height="28" rx="3" fill="url(#ko3d-acts-2)" />
        <rect x="41" y="24" width="11" height="22" rx="3" fill="url(#ko3d-acts-3)" />
      </g>
    </svg>
  );
}
