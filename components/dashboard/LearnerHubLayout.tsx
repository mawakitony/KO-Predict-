"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import {
  IconBook,
  IconDashboard,
  IconUser,
  IconUsers,
} from "@/components/admin/AdminIcons";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { resolveDisplayName } from "@/lib/profile/display";

interface LearnerHubLayoutProps {
  email?: string | null;
  firstName?: string;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  title: string;
  subtitle?: string;
  /** Ex. « École · Live » sous le sous-titre */
  statusBadge?: string;
  /** Titre de section sous le badge (ex. Dashboard) */
  sectionTitle?: string;
  /** CTA sous la carte profil (ex. Administration) */
  headerAction?: { href: string; label: string };
  /** Affiche la barre sticky type admin en haut (vue école) */
  topBar?: boolean;
  showAdminLink?: boolean;
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

/** Shell dashboard apprenant — desktop sidebar + nav mobile uniquement < lg. */
export function LearnerHubLayout({
  email,
  firstName,
  lastName,
  displayName,
  avatarUrl,
  title,
  subtitle,
  statusBadge,
  sectionTitle,
  headerAction,
  topBar,
  showAdminLink = false,
  children,
}: LearnerHubLayoutProps) {
  const pathname = usePathname();
  const onDash = pathname.startsWith("/dashboard");
  const onLearning = pathname.startsWith("/learning");
  const onAdmin = pathname.startsWith("/admin");
  const onProfile = pathname.startsWith("/profile");
  const shownName = resolveDisplayName({
    displayName,
    firstName,
    lastName,
    email,
  });

  return (
    <div className="ko-dash-bg ko-dash-shell min-h-full flex-1">
      <div aria-hidden className="ko-dash-aurora" />
      <div className="relative mx-auto w-full max-w-[1440px] lg:px-4 lg:py-4">
        <aside className="ko-dash-sidebar ko-dash-sidebar-pin hidden lg:flex">
          <div className="shrink-0 px-5 pt-6">
            <BrandMark href="/" size="sm" tone="dark" />
            <p className="mt-1 text-xs font-medium text-slate-400">
              {topBar ? "Tableau de bord de l'école" : "Espace apprenant"}
            </p>
          </div>

          <nav
            className="mt-6 flex-1 space-y-1 overflow-y-auto px-3"
            aria-label="Navigation apprenant"
          >
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Menu
            </p>
            <NavItem
              href="/dashboard"
              label="Tableau de bord"
              active={onDash}
              icon={<IconDashboard className="ko-icon" />}
            />
            <NavItem
              href="/learning"
              label="Ma progression"
              active={onLearning}
              icon={<IconBook className="ko-icon" />}
            />
            <NavItem
              href="/profile"
              label="Mon profil"
              active={onProfile}
              icon={<IconUser className="ko-icon" />}
            />
            {showAdminLink ? (
              <>
                <p className="px-3 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Équipe
                </p>
                <NavItem
                  href="/admin"
                  label="Administration"
                  active={onAdmin}
                  icon={<IconUsers className="ko-icon" />}
                />
              </>
            ) : null}
          </nav>

          <div className="mt-auto shrink-0 space-y-3 px-3 pb-4 pt-3">
            <div>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Compte
              </p>
              <SignOutButton variant="nav" />
            </div>
            <div className="ko-dash-side-card relative z-[1] p-4">
              <p className="relative ko-display text-sm font-bold text-white">
                Besoin d&apos;aide ?
              </p>
              <p className="relative mt-1 text-xs leading-relaxed text-white/70">
                Contactez WOLOYEM pour votre accès ou votre parcours.
              </p>
              <Link
                href="/"
                className="relative mt-3 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-teal-500 px-3 py-2 text-xs font-bold text-white shadow-[0_10px_20px_-12px_rgba(59,130,246,0.9)] transition hover:scale-[1.02]"
              >
                Retour à l&apos;accueil
              </Link>
            </div>
          </div>
        </aside>

        <div className="ko-dash-main-offset flex min-w-0 flex-col px-3 pb-24 pt-0 sm:px-5 lg:px-2 lg:pb-10 lg:pt-0">
          {topBar ? (
            <section className="ko-school-head" aria-label="En-tête vue école">
              <div className="ko-school-topbar">
                <div className="ko-school-topbar-left">
                  <span className="ko-school-topbar-icon" aria-hidden>
                    <IconDashboard className="ko-icon" />
                  </span>
                  <div className="min-w-0">
                    {shownName ? (
                      <p className="ko-school-topbar-hello">
                        Bonjour, {shownName}
                      </p>
                    ) : null}
                    <h1 className="ko-school-topbar-title">{title}</h1>
                    {subtitle ? (
                      <p className="ko-school-topbar-sub">{subtitle}</p>
                    ) : null}
                  </div>
                </div>
                <Link
                  href="/profile"
                  className="ko-dash-profile-pill ko-school-topbar-account"
                  aria-label="Modifier mon profil"
                  title="Modifier mon profil"
                >
                  <UserAvatar
                    displayName={displayName}
                    firstName={firstName}
                    lastName={lastName}
                    email={email}
                    imageUrl={avatarUrl}
                    size="sm"
                  />
                  <div className="hidden min-w-0 text-left sm:block">
                    <p className="ko-dash-profile-name">{shownName}</p>
                    <p className="ko-dash-profile-email">
                      {email ?? "KO Predict™"}
                    </p>
                  </div>
                </Link>
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
              className={`ko-dash-header mb-5 flex flex-wrap items-start justify-between gap-4 pt-4 sm:mb-7 sm:gap-5 sm:pt-5 lg:pt-1${
                statusBadge || sectionTitle ? " is-school" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2 lg:hidden">
                  <BrandMark href="/" size="sm" tone="dark" />
                </div>
                {shownName ? (
                  <p className="ko-dash-hello">Bonjour, {shownName}</p>
                ) : null}
                <h1 className="ko-dash-title">{title}</h1>
                {subtitle ? <p className="ko-dash-subtitle">{subtitle}</p> : null}
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

              <div className="ko-dash-header-aside">
                <Link
                  href="/profile"
                  className="ko-dash-profile-pill"
                  aria-label="Modifier mon profil"
                  title="Modifier mon profil"
                >
                  <UserAvatar
                    displayName={displayName}
                    firstName={firstName}
                    lastName={lastName}
                    email={email}
                    imageUrl={avatarUrl}
                    size="sm"
                  />
                  <div className="hidden min-w-0 text-left sm:block">
                    <p className="ko-dash-profile-name">{shownName}</p>
                    <p className="ko-dash-profile-email">
                      {email ?? "KO Predict™"}
                    </p>
                  </div>
                </Link>
                {headerAction ? (
                  <Link href={headerAction.href} className="ko-dash-header-cta">
                    {headerAction.label}
                    <span aria-hidden>→</span>
                  </Link>
                ) : null}
              </div>
            </header>
          )}

          <main className="ko-dash-stagger min-w-0 space-y-3 sm:space-y-4">
            {children}
          </main>
        </div>
      </div>

      <nav
        className="ko-mobile-nav"
        aria-label="Navigation mobile apprenant"
      >
        <MobileNavLink
          href="/dashboard"
          label="Dashboard"
          active={onDash}
          icon={<IconDashboard className="ko-icon" />}
        />
        <MobileNavLink
          href="/learning"
          label="Progression"
          active={onLearning}
          icon={<IconBook className="ko-icon" />}
        />
        <MobileNavLink
          href="/profile"
          label="Profil"
          active={onProfile}
          icon={<IconUser className="ko-icon" />}
        />
        {showAdminLink ? (
          <MobileNavLink
            href="/admin"
            label="Admin"
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
