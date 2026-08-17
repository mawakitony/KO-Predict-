import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function base(props: IconProps) {
  const { className = "ko-icon", ...rest } = props;
  return { className, ...rest };
}

export function IconUsers(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconTeam(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconDashboard(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.8-3.2 4.5-4.8 8-4.8s6.2 1.6 8 4.8" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconBan(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}

export function IconRefresh(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function IconMail(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

export function IconSpark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M12 3v4" />
      <path d="M12 17v4" />
      <path d="M3 12h4" />
      <path d="M17 12h4" />
      <path d="m5.6 5.6 2.8 2.8" />
      <path d="m15.6 15.6 2.8 2.8" />
      <path d="m5.6 18.4 2.8-2.8" />
      <path d="m15.6 8.4 2.8-2.8" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconFilter(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  );
}

export function IconDownload(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export function IconSort(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="m3 16 4 4 4-4" />
      <path d="M7 20V4" />
      <path d="m21 8-4-4-4 4" />
      <path d="M17 4v16" />
    </svg>
  );
}

export function IconMore(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
      <circle cx="5" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconPhone(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.68 2.34a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.74.32 1.53.55 2.34.68A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

export function IconActivity(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  );
}

export function IconTarget(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function IconInbox(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...base(props)}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

/** Icônes duotone — pastilles de détail (interventions). */
export function IconTargetDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.18" />
      <circle cx="12" cy="12" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" />
    </svg>
  );
}

export function IconPulseDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <rect x="2" y="2" width="20" height="20" rx="6" fill="currentColor" opacity="0.16" />
      <path
        d="M3.5 12.5H7l2-5.5 3.2 11 2.4-7.2H20.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconClockDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.16" />
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 7.2V12l3.4 2" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1.35" fill="currentColor" />
    </svg>
  );
}

export function IconCalendarDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <rect x="3" y="5" width="18" height="16" rx="3" fill="currentColor" opacity="0.16" />
      <rect x="3" y="5" width="18" height="5.2" rx="2.4" fill="currentColor" opacity="0.88" />
      <rect x="3" y="5" width="18" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3.5v3.4M16 3.5v3.4" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
      <circle cx="8.2" cy="14.4" r="1.05" fill="currentColor" />
      <circle cx="12" cy="14.4" r="1.05" fill="currentColor" />
      <circle cx="15.8" cy="14.4" r="1.05" fill="currentColor" />
    </svg>
  );
}

export function IconBookDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <path d="M5 4.4c0-.8.7-1.4 1.5-1.4H19v16.2H6.5c-.8 0-1.5-.6-1.5-1.4V4.4Z" fill="currentColor" opacity="0.16" />
      <path d="M6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13A2.5 2.5 0 0 1 6.5 3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 18.6c.4-.7 1.2-1.1 2.1-1.1H20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8.2 7.4h8.2M8.2 11h6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconPhoneDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <path d="M8.2 2.8h7.6A2.4 2.4 0 0 1 18.2 5.2v13.6a2.4 2.4 0 0 1-2.4 2.4H8.2A2.4 2.4 0 0 1 5.8 18.8V5.2A2.4 2.4 0 0 1 8.2 2.8Z" fill="currentColor" opacity="0.18" />
      <path d="M8.2 2.8h7.6A2.4 2.4 0 0 1 18.2 5.2v13.6a2.4 2.4 0 0 1-2.4 2.4H8.2A2.4 2.4 0 0 1 5.8 18.8V5.2A2.4 2.4 0 0 1 8.2 2.8Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <rect x="9.1" y="5.4" width="5.8" height="10.2" rx="1.1" fill="currentColor" opacity="0.88" />
      <circle cx="12" cy="18.35" r="0.85" fill="currentColor" />
    </svg>
  );
}

export function IconBellDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <path d="M12 3.2a6.2 6.2 0 0 1 6.2 6.2c0 3.4.9 5.4 1.8 6.8H4c.9-1.4 1.8-3.4 1.8-6.8A6.2 6.2 0 0 1 12 3.2Z" fill="currentColor" opacity="0.2" />
      <path d="M6.2 8.2a5.8 5.8 0 0 1 11.6 0c0 6.6 2.6 8.4 2.6 8.4H3.6s2.6-1.8 2.6-8.4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M10.2 20.2a2 2 0 0 0 3.6 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="17.6" cy="6.2" r="2.15" fill="currentColor" />
    </svg>
  );
}

export function IconInboxDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <path d="M4.2 7.2 6.4 3.8h11.2L20 7.2v10.4A2.4 2.4 0 0 1 17.6 20H6.4A2.4 2.4 0 0 1 4 17.6V7.2Z" fill="currentColor" opacity="0.16" />
      <path d="M4.2 7.2 6.6 3.6h10.8L19.8 7.2v10.2a2.4 2.4 0 0 1-2.4 2.4H6.6A2.4 2.4 0 0 1 4.2 17.4V7.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M4.2 12.2h4.2l1.5 2.4h4.2l1.5-2.4h4.2" fill="currentColor" opacity="0.22" />
      <path d="M4.2 12.2h4.2l1.5 2.4h4.2l1.5-2.4h4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAlertDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <path d="M12 3.6 21.4 20.2H2.6L12 3.6Z" fill="currentColor" opacity="0.18" />
      <path d="M10.3 4.6 2.3 18.6A2 2 0 0 0 4 21.5h16a2 2 0 0 0 1.7-2.9L13.7 4.6a2 2 0 0 0-3.4 0Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 9.2v5.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17.15" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function IconEyeDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <path d="M2.6 12S6.2 5.4 12 5.4 21.4 12 21.4 12 17.8 18.6 12 18.6 2.6 12 2.6 12Z" fill="currentColor" opacity="0.16" />
      <path d="M2.6 12S6.2 5.4 12 5.4 21.4 12 21.4 12 17.8 18.6 12 18.6 2.6 12 2.6 12Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="3.15" fill="currentColor" />
      <circle cx="12.7" cy="11.2" r="1" fill="#fff" />
    </svg>
  );
}

export function IconCheckDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.18" />
      <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7.6 12.3 10.4 15l6-6.4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconBanDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.16" />
      <circle cx="12" cy="12" r="8.15" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.1 7.1 16.9 16.9" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}

export function IconUserDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.16" />
      <circle cx="12" cy="8.2" r="3.15" fill="currentColor" />
      <path d="M5.6 18.6c1.5-2.7 3.8-4.1 6.4-4.1s4.9 1.4 6.4 4.1" fill="currentColor" opacity="0.92" />
    </svg>
  );
}

export function IconTeamDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <circle cx="9" cy="8" r="3.1" fill="currentColor" />
      <path d="M3.4 19c1.4-2.7 3.5-4.1 5.6-4.1 2.1 0 4.2 1.4 5.6 4.1" fill="currentColor" opacity="0.92" />
      <circle cx="16.4" cy="8.4" r="2.45" fill="currentColor" opacity="0.55" />
      <path d="M14.2 19c.7-1.7 1.8-2.8 3.2-3.3 1.5.4 2.7 1.5 3.6 3.3" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

export function IconMailDuo(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden {...base(props)}>
      <rect x="3" y="5.2" width="18" height="13.6" rx="2.6" fill="currentColor" opacity="0.16" />
      <rect x="3" y="5.2" width="18" height="13.6" rx="2.6" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4.2 7.1 12 13.1 19.8 7.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
