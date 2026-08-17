"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/ui/BrandMark";
import {
  IconBook,
  IconCalendar,
  IconDashboard,
  IconUser,
  IconUsers,
} from "@/components/admin/AdminIcons";
import {
  Icon3dBell,
  Icon3dSearch,
} from "@/components/dashboard/LearnerHeaderIcons";
import { LearnerAutoPopups } from "@/components/learner/LearnerAutoPopups";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { ClientInspectionDeterrent } from "@/components/security/ClientInspectionDeterrent";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { formatDate } from "@/lib/i18n/format-date";
import { formatSyncRelative } from "@/lib/learning/format";
import { resolveDisplayName } from "@/lib/profile/display";
import type { EstimationPopupContent } from "@/lib/dashboard/estimation-popup";

type LearnerHubPage =
  | "dashboard"
  | "learning"
  | "plan"
  | "messages"
  | "profile"
  | "unavailable";

interface LearnerHubLayoutProps {
  email?: string | null;
  firstName?: string;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  title: string;
  subtitle?: string;
  page?: LearnerHubPage;
  certification?: string | null;
  examDate?: string | null;
  recordedAt?: string | null;
  collecting?: boolean;
  /** Ex. « École · Live » sous le sous-titre */
  statusBadge?: string;
  /** Titre de section sous le badge (ex. Dashboard) */
  sectionTitle?: string;
  /** CTA sous la carte profil (ex. Administration) */
  headerAction?: { href: string; label: string };
  /** Affiche la barre sticky type admin en haut (vue école) */
  topBar?: boolean;
  showAdminLink?: boolean;
  /** Contenu popup estimation (évite un fetch si déjà connu côté serveur). */
  estimationPopup?: EstimationPopupContent | null;
  children: ReactNode;
}

function NavItem({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_14px_28px_-12px_rgba(37,99,235,0.9)]"
          : "text-slate-500 hover:translate-x-0.5 hover:bg-slate-100 hover:text-slate-800"
      }`}
    >
      <span
        className={`transition-transform duration-300 ${
          active ? "text-white" : "text-slate-400 group-hover:scale-110"
        }`}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition ${
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
      }`}
    >
      <span className={active ? "text-blue-600" : "text-slate-400"}>{icon}</span>
      <span className="truncate">{label}</span>
    </Link>
  );
}

function LearnerHeaderTools({
  shownName,
  displayName,
  firstName,
  lastName,
  email,
  avatarUrl,
  headerAction,
}: {
  shownName: string;
  displayName?: string | null;
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  headerAction?: { href: string; label: string };
}) {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/me/reminders");
        const body = (await res.json().catch(() => null)) as {
          ok?: boolean;
          unreadCount?: number;
        } | null;
        if (!cancelled && res.ok && body?.ok) {
          setUnreadCount(
            typeof body.unreadCount === "number" ? body.unreadCount : 0,
          );
        }
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/messages")) {
      setUnreadCount(0);
    }
  }, [pathname]);

  const hasUnread = unreadCount > 0;
  const { t } = useLanguage();

  return (
    <div className="ko-dash-header-aside">
      <Link
        href="/learning"
        className="ko-dash-toolbar-btn is-3d"
        aria-label={t("chrome.searchActivity")}
        title={t("chrome.search")}
      >
        <Icon3dSearch />
      </Link>
      <Link
        href="/messages"
        className="ko-dash-toolbar-btn is-3d"
        aria-label={
          hasUnread
            ? t("chrome.messagesUnread", { count: unreadCount })
            : t("chrome.messagesAndReminders")
        }
        title={t("chrome.messages")}
      >
        <Icon3dBell />
        {hasUnread ? (
          <span className="ko-dash-toolbar-badge" aria-hidden />
        ) : null}
      </Link>
      <Link
        href="/profile"
        className="ko-dash-profile-pill"
        aria-label={t("chrome.editProfile")}
        title={t("chrome.editProfile")}
      >
        <UserAvatar
          displayName={displayName}
          firstName={firstName}
          lastName={lastName}
          email={email}
          imageUrl={avatarUrl}
          size="sm"
        />
        <span className="ko-dash-profile-meta">
          <span className="ko-dash-profile-welcome">{t("chrome.welcome")}</span>
          <span className="ko-dash-profile-name-row">
            <span className="ko-dash-profile-name truncate">{shownName}</span>
            <svg
              className="ko-dash-profile-chevron"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <path
                d="M5 7.5 10 12.5 15 7.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </span>
      </Link>
      {headerAction ? (
        <Link href={headerAction.href} className="ko-dash-header-cta">
          {headerAction.label}
          <span aria-hidden>→</span>
        </Link>
      ) : null}
    </div>
  );
}

/** Shell dashboard apprenant — desktop sidebar + nav mobile uniquement < lg. */
export function LearnerHubLayout({
  email,
  firstName,
  lastName,
  displayName,
  avatarUrl,
  title,
  subtitle,
  page,
  certification,
  examDate,
  recordedAt,
  collecting = false,
  statusBadge,
  sectionTitle,
  headerAction,
  topBar,
  showAdminLink = false,
  estimationPopup = null,
  children,
}: LearnerHubLayoutProps) {
  const pathname = usePathname();
  const onDash = pathname.startsWith("/dashboard");
  const onLearning = pathname.startsWith("/learning");
  const onPlan = pathname.startsWith("/plan");
  const onAdmin = pathname.startsWith("/admin");
  const onProfile = pathname.startsWith("/profile");
  const shownName = resolveDisplayName({
    displayName,
    firstName,
    lastName,
    email,
  });
  const { t, locale } = useLanguage();

  let headingTitle = title;
  let headingSubtitle = subtitle;
  if (page === "dashboard") {
    headingTitle = t("learner.dashboardTitle");
    headingSubtitle = [
      certification,
      examDate
        ? t("learner.examOn", { date: formatDate(examDate, locale) })
        : null,
      !collecting
        ? formatDate(new Date().toISOString().slice(0, 10), locale)
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
  } else if (page === "unavailable") {
    headingTitle = t("learner.dashboardUnavailable");
    headingSubtitle = subtitle || t("learner.loadFail");
  } else if (page === "profile") {
    headingTitle = t("learner.profileTitle");
    headingSubtitle = t("learner.profileSubtitle");
  } else if (page === "learning") {
    headingTitle = t("learner.learningTitle");
    headingSubtitle = formatSyncRelative(recordedAt, locale);
  } else if (page === "plan") {
    headingTitle = t("learner.planTitle");
    headingSubtitle = t("learner.planSubtitle");
  } else if (page === "messages") {
    headingTitle = t("learner.messagesTitle");
    headingSubtitle = t("learner.messagesSubtitle");
  }

  return (
    <div className="ko-dash-bg ko-dash-shell min-h-full flex-1">
      <ClientInspectionDeterrent />
      <div aria-hidden className="ko-dash-aurora" />
      <div className="relative mx-auto w-full lg:pl-0">
        <aside className="ko-dash-sidebar ko-dash-sidebar-pin hidden lg:flex">
          <div className="shrink-0 px-5 pt-6">
            <BrandMark href="/" size="sm" tone="dark" />
            <p className="mt-1 text-xs font-medium text-slate-400">
              {topBar
                ? t("nav.schoolDashboard")
                : showAdminLink
                  ? t("chrome.teamSpace")
                  : t("chrome.learnerSpace")}
            </p>
          </div>

          <nav
            className="mt-6 flex-1 space-y-1 overflow-y-auto px-3"
            aria-label={
              showAdminLink ? t("chrome.teamNav") : t("chrome.learnerNav")
            }
          >
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {t("nav.menu")}
            </p>
            <NavItem
              href="/dashboard"
              label={t("nav.dashboard")}
              active={onDash}
              icon={<IconDashboard className="ko-icon" />}
            />
            {!showAdminLink ? (
              <>
                <NavItem
                  href="/learning"
                  label={t("nav.progress")}
                  active={onLearning}
                  icon={<IconBook className="ko-icon" />}
                />
                <NavItem
                  href="/plan"
                  label={t("nav.plan")}
                  active={onPlan}
                  icon={<IconCalendar className="ko-icon" />}
                />
              </>
            ) : null}
            <NavItem
              href="/profile"
              label={t("nav.profile")}
              active={onProfile}
              icon={<IconUser className="ko-icon" />}
            />
            {showAdminLink ? (
              <>
                <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {t("nav.teamSection")}
                </p>
                <NavItem
                  href="/admin"
                  label={t("nav.admin")}
                  active={onAdmin}
                  icon={<IconUsers className="ko-icon" />}
                />
              </>
            ) : null}
          </nav>

          <div className="mt-auto shrink-0 space-y-3 px-3 pb-4 pt-3">
            <div>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {t("nav.account")}
              </p>
              <div className="mb-2 px-0.5">
                <div className="ko-chrome-prefs">
                  <LanguageToggle />
                  <ThemeToggle />
                </div>
              </div>
              <SignOutButton variant="nav" />
            </div>
            <div className="ko-dash-side-card relative z-[1] p-4">
              <p className="relative ko-display text-sm font-bold text-white">
                {t("chrome.helpTitle")}
              </p>
              <p className="relative mt-1 text-xs leading-relaxed text-white/70">
                {t("chrome.helpBody")}
              </p>
              <Link
                href="/"
                className="relative mt-3 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-teal-500 px-3 py-2 text-xs font-bold text-white shadow-[0_10px_20px_-12px_rgba(59,130,246,0.9)] transition hover:scale-[1.02]"
              >
                {t("chrome.backHome")}
              </Link>
            </div>
          </div>
        </aside>

        <div className="ko-dash-main-offset flex min-w-0 flex-col px-0 pb-32 lg:pb-8">
          {topBar ? (
            <section className="ko-school-head" aria-label={t("chrome.schoolHead")}>
              <div className="ko-school-topbar">
                <div className="ko-school-topbar-left">
                  <span className="ko-school-topbar-icon" aria-hidden>
                    <IconDashboard className="ko-icon" />
                  </span>
                  <div className="min-w-0">
                    {shownName ? (
                      <p className="ko-school-topbar-hello">
                        {t("chrome.hello", { name: shownName })}
                      </p>
                    ) : null}
                    <h1 className="ko-school-topbar-title">{headingTitle}</h1>
                    {headingSubtitle ? (
                      <p className="ko-school-topbar-sub">{headingSubtitle}</p>
                    ) : null}
                  </div>
                </div>
                <LearnerHeaderTools
                  shownName={shownName}
                  displayName={displayName}
                  firstName={firstName}
                  lastName={lastName}
                  email={email}
                  avatarUrl={avatarUrl}
                  headerAction={headerAction}
                />
              </div>

              {statusBadge ? (
                <div className="ko-school-actions">
                  <p className="ko-dash-status">
                    <span className="ko-dash-status-dot" aria-hidden />
                    {statusBadge}
                  </p>
                </div>
              ) : null}
            </section>
          ) : (
            <header
              className={`ko-dash-header${
                statusBadge || sectionTitle ? " is-school" : ""
              }`}
            >
              <div className="ko-dash-header-inner">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2 lg:hidden">
                    <BrandMark href="/" size="sm" tone="dark" />
                  </div>
                  {shownName ? (
                    <p className="ko-dash-hello">{t("chrome.hello", { name: shownName })}</p>
                  ) : null}
                  <h1 className="ko-dash-title">{headingTitle}</h1>
                  {headingSubtitle ? (
                    <p className="ko-dash-subtitle">{headingSubtitle}</p>
                  ) : null}
                  {statusBadge || sectionTitle ? (
                    <div className="ko-dash-school-meta">
                      {statusBadge ? (
                        <p className="ko-dash-status">
                          <span className="ko-dash-status-dot" aria-hidden />
                          {statusBadge}
                        </p>
                      ) : null}
                      {sectionTitle ? (
                        <h2 className="ko-dash-section-title">{sectionTitle}</h2>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <LearnerHeaderTools
                  shownName={shownName}
                  displayName={displayName}
                  firstName={firstName}
                  lastName={lastName}
                  email={email}
                  avatarUrl={avatarUrl}
                  headerAction={headerAction}
                />
              </div>
            </header>
          )}

          <main className="ko-dash-stagger min-w-0 space-y-3 px-3 pt-3 sm:space-y-4 sm:px-5 lg:px-6 lg:pt-4">
            {children}
          </main>
        </div>
      </div>

      <LearnerAutoPopups initialEstimation={estimationPopup} />

      <nav
        className="ko-mobile-nav"
        aria-label={
          showAdminLink ? t("chrome.teamNavMobile") : t("chrome.learnerNavMobile")
        }
      >
        <div className="ko-mobile-nav-theme">
          <div className="ko-chrome-prefs">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <MobileNavLink
          href="/dashboard"
          label={t("nav.dashboardShort")}
          active={onDash}
          icon={<IconDashboard className="ko-icon" />}
        />
        {!showAdminLink ? (
          <>
            <MobileNavLink
              href="/learning"
              label={t("nav.progressShort")}
              active={onLearning}
              icon={<IconBook className="ko-icon" />}
            />
            <MobileNavLink
              href="/plan"
              label={t("nav.planShort")}
              active={onPlan}
              icon={<IconCalendar className="ko-icon" />}
            />
          </>
        ) : null}
        <MobileNavLink
          href="/profile"
          label={t("nav.profileShort")}
          active={onProfile}
          icon={<IconUser className="ko-icon" />}
        />
        {showAdminLink ? (
          <MobileNavLink
            href="/admin"
            label={t("nav.adminShort")}
            active={onAdmin}
            icon={<IconUsers className="ko-icon" />}
          />
        ) : null}
        <div className="flex min-w-0 flex-1 items-stretch">
          <SignOutButton variant="mobile" />
        </div>
      </nav>
    </div>
  );
}
