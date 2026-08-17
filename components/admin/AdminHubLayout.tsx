"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import {
  IconDashboard,
  IconSpark,
  IconTeam,
  IconUser,
  IconUsers,
} from "@/components/admin/AdminIcons";
import {
  AdminLearnersChromeProvider,
  AdminLearnersHeaderTabs,
  useAdminLearnersChrome,
} from "@/components/admin/AdminLearnersHeaderTabs";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { resolveDisplayName } from "@/lib/profile/display";

interface AdminHubLayoutProps {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  canManageTeam?: boolean;
  /** Lien Sécurité (/account/security) — super_admin uniquement. */
  showSecurityLink?: boolean;
  children: ReactNode;
}

function NavItem({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: ReactNode;
  active: boolean;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-[var(--admin-blue)] text-white shadow-[0_8px_18px_-10px_rgba(37,99,235,0.9)]"
          : "text-slate-600 hover:bg-[var(--admin-blue-soft)] hover:text-[var(--admin-blue-hover)]"
      }`}
    >
      <span className={active ? "text-white" : "text-[var(--admin-blue)]"}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </Link>
  );
}

function KoPredictNavItem({ active }: { active: boolean }) {
  const { koCount } = useAdminLearnersChrome();
  return (
    <Link
      href="/admin?tab=kopredict"
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-[var(--admin-blue)] text-white shadow-[0_8px_18px_-10px_rgba(37,99,235,0.9)]"
          : "text-slate-700 hover:bg-[var(--admin-blue-soft)] hover:text-[var(--admin-blue-hover)]"
      }`}
      aria-current={active ? "page" : undefined}
    >
      <span className={active ? "text-white" : "text-[var(--admin-blue)]"}>
        <IconSpark className="ko-icon" />
      </span>
      <span className="ko-brand min-w-0 flex-1 truncate tracking-tight">
        <span className={active ? "text-white" : "ko-brand-ko"}>KO</span>
        <span className={active ? "text-white/95" : "ko-brand-predict"}>
          &nbsp;Predict™
        </span>
      </span>
      {koCount != null ? (
        <span
          className={`inline-flex min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
            active
              ? "bg-white/20 text-white"
              : "bg-[var(--admin-blue-soft)] text-[var(--admin-blue-hover)]"
          }`}
        >
          {koCount}
        </span>
      ) : null}
    </Link>
  );
}

function AdminNavLinks({
  canManageTeam,
  showSecurityLink,
}: {
  canManageTeam: boolean;
  showSecurityLink: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onKoPredict =
    pathname === "/admin" && searchParams.get("tab") === "kopredict";
  const onAllLearners =
    (pathname === "/admin" && !onKoPredict) ||
    pathname.startsWith("/admin/students");
  const onTeam = pathname.startsWith("/admin/team");
  const onSchool = pathname.startsWith("/admin/ecole");
  const onProfile = pathname.startsWith("/profile");
  const onSecurity = pathname.startsWith("/account/security");

  return (
    <>
      <NavItem
        href="/admin"
        label="Apprenants"
        active={onAllLearners}
        icon={<IconUsers className="ko-icon" />}
      />
      <KoPredictNavItem active={onKoPredict} />
      {canManageTeam ? (
        <NavItem
          href="/admin/team"
          label="Équipe WOLOYEM"
          active={onTeam}
          icon={<IconTeam className="ko-icon" />}
        />
      ) : null}
      <NavItem
        href="/admin/ecole"
        label="Tableau de bord de l'école"
        active={onSchool}
        icon={<IconDashboard className="ko-icon" />}
      />
      <NavItem
        href="/profile"
        label="Mon profil"
        active={onProfile}
        icon={<IconUser className="ko-icon" />}
      />
      {showSecurityLink ? (
        <NavItem
          href="/account/security"
          label="Sécurité"
          active={onSecurity}
          icon={<IconSpark className="ko-icon" />}
        />
      ) : null}
    </>
  );
}

function AdminHeaderMeta() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { studentFocus } = useAdminLearnersChrome();
  const onStudentDetail = pathname.startsWith("/admin/students/");
  const onKoPredict =
    pathname === "/admin" && searchParams.get("tab") === "kopredict";
  const onLearnersList = pathname === "/admin";
  const onTeam = pathname.startsWith("/admin/team");
  const onSchool = pathname.startsWith("/admin/ecole");
  const onProfile = pathname.startsWith("/profile");
  const onSecurity = pathname.startsWith("/account/security");

  const headerTitle = onSecurity
    ? "Sécurité du compte"
    : onProfile
    ? "Mon profil"
    : onTeam
      ? "Équipe WOLOYEM"
      : onSchool
        ? "Tableau de bord de l'école"
        : onStudentDetail
          ? (studentFocus?.fullName ?? "Apprenant")
          : onKoPredict
            ? "KO Predict™"
            : onLearnersList
              ? "Apprenants"
              : "Administration";
  const headerSubtitle = onSecurity
    ? "Vérification en deux étapes et sessions"
    : onProfile
    ? "Préférences KO Predict™"
    : onTeam
      ? "Comptes coach et admin"
      : onSchool
        ? "Vue d'ensemble de la promotion KO Predict™"
        : onStudentDetail
          ? studentFocus?.formationTitle
            ? `${studentFocus.formationTitle} · Dossier apprenant`
            : "Dossier apprenant"
          : onKoPredict
            ? "Suivi et interventions des apprenants activés"
            : "Gestion des comptes LearnWorlds et KO Predict™";
  const HeaderIcon = onSecurity || onProfile
    ? IconUser
    : onTeam
      ? IconTeam
      : onSchool
        ? IconDashboard
        : onStudentDetail
          ? IconUser
          : onKoPredict
            ? IconSpark
            : IconUsers;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-blue-soft)] text-[var(--admin-blue)]">
        <HeaderIcon className="ko-icon" />
      </span>
      <div className="min-w-0">
        <p className="ko-display truncate text-base font-semibold text-slate-900 sm:text-lg">
          {headerTitle}
        </p>
        <p className="truncate text-xs text-slate-500 sm:text-sm">
          {headerSubtitle}
        </p>
      </div>
    </div>
  );
}

function AdminBottomNavLink({
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
      className={`ko-admin-bottom-link${active ? " is-active" : ""}`}
      aria-current={active ? "page" : undefined}
    >
      <span className="ko-admin-bottom-icon">{icon}</span>
      <span className="ko-admin-bottom-label">{label}</span>
    </Link>
  );
}

function AdminBottomNav({
  canManageTeam,
  showSecurityLink,
}: {
  canManageTeam: boolean;
  showSecurityLink: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onKoPredict =
    pathname === "/admin" && searchParams.get("tab") === "kopredict";
  const onAllLearners =
    (pathname === "/admin" && !onKoPredict) ||
    pathname.startsWith("/admin/students");
  const onTeam = pathname.startsWith("/admin/team");
  const onSchool = pathname.startsWith("/admin/ecole");
  const onProfile = pathname.startsWith("/profile");
  const onSecurity = pathname.startsWith("/account/security");

  return (
    <nav className="ko-admin-mobile-nav" aria-label="Navigation admin mobile">
      <AdminBottomNavLink
        href="/admin"
        label="Apprenants"
        active={onAllLearners}
        icon={<IconUsers className="ko-icon" />}
      />
      <AdminBottomNavLink
        href="/admin?tab=kopredict"
        label="KO Predict"
        active={onKoPredict}
        icon={<IconSpark className="ko-icon" />}
      />
      <AdminBottomNavLink
        href="/admin/ecole"
        label="École"
        active={onSchool}
        icon={<IconDashboard className="ko-icon" />}
      />
      {canManageTeam ? (
        <AdminBottomNavLink
          href="/admin/team"
          label="Équipe"
          active={onTeam}
          icon={<IconTeam className="ko-icon" />}
        />
      ) : null}
      <AdminBottomNavLink
        href="/profile"
        label="Profil"
        active={onProfile}
        icon={<IconUser className="ko-icon" />}
      />
      {showSecurityLink ? (
        <AdminBottomNavLink
          href="/account/security"
          label="Sécurité"
          active={onSecurity}
          icon={<IconSpark className="ko-icon" />}
        />
      ) : null}
    </nav>
  );
}

/** Layout admin type hub (sidebar desktop + bottom nav mobile). */
export function AdminHubLayout({
  email,
  firstName,
  lastName,
  displayName,
  avatarUrl,
  canManageTeam = false,
  showSecurityLink = false,
  children,
}: AdminHubLayoutProps) {
  const shownName = resolveDisplayName({
    displayName,
    firstName,
    lastName,
    email,
  });

  return (
    <AdminLearnersChromeProvider>
      <div className="ko-admin-shell min-h-full flex-1">
        <div className="flex min-h-full w-full">
          <aside className="ko-admin-sidebar hidden lg:flex">
            <div className="shrink-0 px-1">
              <BrandMark href="/" size="sm" tone="dark" />
              <p className="mt-1 px-1 text-xs text-slate-400">Espace équipe</p>
            </div>

            <nav
              className="mt-8 flex-1 space-y-1 overflow-y-auto"
              aria-label="Navigation admin"
            >
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Principal
              </p>
              <Suspense fallback={null}>
                <AdminNavLinks
                  canManageTeam={canManageTeam}
                  showSecurityLink={showSecurityLink}
                />
              </Suspense>
            </nav>

            <div className="mt-auto rounded-2xl border border-blue-100 bg-[var(--admin-blue-soft)] p-3">
              <Link
                href="/profile"
                className="flex items-center gap-3 rounded-xl transition hover:bg-white/60"
                aria-label="Modifier mon profil"
              >
                <UserAvatar
                  displayName={displayName}
                  firstName={firstName}
                  lastName={lastName}
                  email={email}
                  imageUrl={avatarUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {shownName}
                  </p>
                  <p className="truncate text-xs text-[var(--admin-blue)]">
                    {email ? "Modifier le profil" : "En ligne"}
                  </p>
                </div>
              </Link>
              <div className="mt-3">
                <SignOutButton variant="dark" />
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="ko-admin-topbar">
              <div className="ko-admin-topbar-left">
                <div className="lg:hidden">
                  <BrandMark href="/" size="sm" tone="dark" />
                </div>
                <div className="min-w-0 flex-1">
                  <Suspense fallback={null}>
                    <AdminHeaderMeta />
                  </Suspense>
                </div>
              </div>

              <div className="ko-admin-topbar-tabs">
                <Suspense fallback={null}>
                  <AdminLearnersHeaderTabs />
                </Suspense>
              </div>

              <div className="ko-admin-topbar-right">
                <Link
                  href="/profile"
                  className="hidden rounded-full ring-2 ring-transparent transition hover:ring-blue-200 sm:inline-flex"
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
                </Link>
                <div className="hidden lg:block">
                  <SignOutButton variant="dark" />
                </div>
              </div>
            </header>

            <main className="ko-admin-main">{children}</main>
          </div>
        </div>

        <Suspense fallback={null}>
          <AdminBottomNav
            canManageTeam={canManageTeam}
            showSecurityLink={showSecurityLink}
          />
        </Suspense>
      </div>
    </AdminLearnersChromeProvider>
  );
}
