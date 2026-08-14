"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import {
  IconDashboard,
  IconTeam,
  IconUser,
  IconUsers,
} from "@/components/admin/AdminIcons";
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
  label: string;
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
      {label}
    </Link>
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
  const pathname = usePathname();
  const onLearners =
    pathname === "/admin" || pathname.startsWith("/admin/students");
  const onTeam = pathname.startsWith("/admin/team");
  const onSchool = pathname.startsWith("/admin/ecole");
  const onProfile = pathname.startsWith("/profile");
  const shownName = resolveDisplayName({
    displayName,
    firstName,
    lastName,
    email,
  });
  const headerTitle = onTeam
    ? "Équipe WOLOYEM"
    : onSchool
      ? "Tableau de bord de l'école"
      : onLearners
        ? "Apprenants"
        : "Administration";
  const headerSubtitle = onTeam
    ? "Comptes coach et admin"
    : onSchool
      ? "Vue d'ensemble de la promotion KO Predict™"
      : "Gestion des comptes LearnWorlds et KO Predict™";
  const HeaderIcon = onTeam
    ? IconTeam
    : onSchool
      ? IconDashboard
      : IconUsers;

  return (
    <div className="min-h-full flex-1 bg-[linear-gradient(180deg,#eef4ff_0%,#f3f5f7_40%,#f3f5f7_100%)]">
      <div className="mx-auto flex w-full max-w-[1400px]">
        <aside className="sticky top-0 z-30 hidden h-dvh w-60 shrink-0 flex-col self-start border-r border-slate-200/80 bg-white/95 px-4 py-6 shadow-[4px_0_24px_-20px_rgba(37,99,235,0.35)] lg:flex">
          <BrandMark href="/" size="sm" tone="dark" />
          <p className="mt-1 px-1 text-xs text-slate-400">Espace équipe</p>

          <nav className="mt-8 space-y-1" aria-label="Navigation admin">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
              Principal
            </p>
            <NavItem
              href="/admin"
              label="Apprenants"
              active={onLearners}
              icon={<IconUsers className="ko-icon" />}
            />
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
          <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-blue-100/80 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <BrandMark href="/" size="sm" tone="dark" />
            </div>
            <div className="hidden flex-1 lg:block">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--admin-blue-soft)] text-[var(--admin-blue)]">
                  <HeaderIcon className="ko-icon" />
                </span>
                <div>
                  <p className="ko-display text-lg font-semibold text-slate-900">
                    {headerTitle}
                  </p>
                  <p className="text-sm text-slate-500">{headerSubtitle}</p>
                </div>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <nav
                className="flex max-w-[55vw] items-center gap-1 overflow-x-auto text-sm scrollbar-none sm:max-w-none sm:gap-3 lg:hidden"
                aria-label="Navigation admin mobile"
              >
                <Link
                  href="/admin"
                  className={`whitespace-nowrap rounded-full px-2.5 py-1 font-medium ${
                    onLearners
                      ? "bg-[var(--admin-blue-soft)] text-[var(--admin-blue-hover)]"
                      : "text-slate-500"
                  }`}
                >
                  Apprenants
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

          <main className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
