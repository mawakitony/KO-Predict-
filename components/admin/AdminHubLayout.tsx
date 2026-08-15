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

function AdminNavLinks({ canManageTeam }: { canManageTeam: boolean }) {
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

  const headerTitle = onTeam
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
  const headerSubtitle = onTeam
    ? "Comptes coach et admin"
    : onSchool
      ? "Vue d'ensemble de la promotion KO Predict™"
      : onStudentDetail
        ? studentFocus?.certification
          ? `${studentFocus.certification} · Dossier apprenant`
          : "Dossier apprenant"
        : onKoPredict
          ? "Suivi et interventions des apprenants activés"
          : "Gestion des comptes LearnWorlds et KO Predict™";
  const HeaderIcon = onTeam
    ? IconTeam
    : onSchool
      ? IconDashboard
      : onStudentDetail
        ? IconUser
        : onKoPredict
          ? IconSpark
          : IconUsers;

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-blue-soft)] text-[var(--admin-blue)]">
        <HeaderIcon className="ko-icon" />
      </span>
      <div className="min-w-0">
        <p className="ko-display truncate text-lg font-semibold text-slate-900">
          {headerTitle}
        </p>
        <p className="truncate text-sm text-slate-500">{headerSubtitle}</p>
      </div>
    </div>
  );
}

function AdminMobileNav({ canManageTeam }: { canManageTeam: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onKoPredict =
    pathname === "/admin" && searchParams.get("tab") === "kopredict";
  const onAllLearners =
    (pathname === "/admin" && !onKoPredict) ||
    pathname.startsWith("/admin/students");
  const onTeam = pathname.startsWith("/admin/team");
  const onSchool = pathname.startsWith("/admin/ecole");

  return (
    <nav
      className="flex max-w-[48vw] items-center gap-1 overflow-x-auto text-sm scrollbar-none sm:max-w-none sm:gap-2 lg:hidden"
      aria-label="Navigation admin mobile"
    >
      <Link
        href="/admin"
        className={`whitespace-nowrap rounded-full px-2.5 py-1 font-medium ${
          onAllLearners
            ? "bg-[var(--admin-blue-soft)] text-[var(--admin-blue-hover)]"
            : "text-slate-500"
        }`}
      >
        Apprenants
      </Link>
      <Link
        href="/admin?tab=kopredict"
        className={`whitespace-nowrap rounded-full px-2.5 py-1 font-semibold ${
          onKoPredict
            ? "bg-[var(--admin-blue-soft)] text-[var(--admin-blue-hover)]"
            : "text-slate-500"
        }`}
      >
        KO Predict™
      </Link>
      {canManageTeam ? (
        <Link
          href="/admin/team"
          className={`whitespace-nowrap rounded-full px-2.5 py-1 ${
            onTeam
              ? "bg-[var(--admin-blue-soft)] font-medium text-[var(--admin-blue-hover)]"
              : "text-slate-500"
          }`}
        >
          Équipe
        </Link>
      ) : null}
      <Link
        href="/admin/ecole"
        className={`whitespace-nowrap rounded-full px-2.5 py-1 ${
          onSchool
            ? "bg-[var(--admin-blue-soft)] font-medium text-[var(--admin-blue-hover)]"
            : "text-slate-500"
        }`}
      >
        École
      </Link>
    </nav>
  );
}

/** Layout admin type hub (sidebar + contenu carte). Accent bleu. */
export function AdminHubLayout({
  email,
  firstName,
  lastName,
  displayName,
  avatarUrl,
  canManageTeam = false,
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
      <div className="min-h-full flex-1 bg-[linear-gradient(180deg,#eef4ff_0%,#f3f5f7_40%,#f3f5f7_100%)]">
        <div className="flex min-h-full w-full">
          <aside className="sticky top-0 z-30 hidden h-dvh w-60 shrink-0 flex-col self-start border-r border-slate-200/80 bg-white px-4 py-6 shadow-[4px_0_24px_-20px_rgba(37,99,235,0.35)] lg:flex">
            <BrandMark href="/" size="sm" tone="dark" />
            <p className="mt-1 px-1 text-xs text-slate-400">Espace équipe</p>

            <nav className="mt-8 space-y-1" aria-label="Navigation admin">
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                Principal
              </p>
              <Suspense fallback={null}>
                <AdminNavLinks canManageTeam={canManageTeam} />
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
            <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-blue-100/80 bg-white/95 px-3 py-3 backdrop-blur sm:px-4 lg:px-5">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <BrandMark href="/" size="sm" tone="dark" />
              </div>

              <div className="hidden min-w-0 shrink lg:block lg:max-w-[18rem] xl:max-w-[22rem]">
                <Suspense fallback={null}>
                  <AdminHeaderMeta />
                </Suspense>
              </div>

              <div className="flex min-w-0 flex-1 items-center justify-center px-1">
                <Suspense fallback={null}>
                  <AdminLearnersHeaderTabs />
                </Suspense>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <Suspense fallback={null}>
                  <AdminMobileNav canManageTeam={canManageTeam} />
                </Suspense>
                <Link
                  href="/profile"
                  className="hidden rounded-full ring-2 ring-transparent transition hover:ring-blue-200 sm:block"
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
                <div className="lg:hidden">
                  <SignOutButton variant="dark" />
                </div>
              </div>
            </header>

            <main className="min-w-0 flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AdminLearnersChromeProvider>
  );
}
