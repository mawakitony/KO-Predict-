import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { AuthHeaderActions } from "@/components/auth/AuthHeaderActions";

interface AppPageHeaderProps {
  email?: string | null;
  title: string;
  subtitle?: string;
  nav?: ReactNode;
  children?: ReactNode;
}

export function AppPageHeader({
  email,
  title,
  subtitle,
  nav,
  children,
}: AppPageHeaderProps) {
  return (
    <header className="mb-8 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BrandMark href="/" tone="light" size="lg" />
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          {nav}
          <AuthHeaderActions email={email} variant="light" />
        </nav>
      </div>
      <h1 className="ko-display mt-7 text-3xl font-medium tracking-tight sm:text-4xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">
          {subtitle}
        </p>
      ) : null}
      {children}
    </header>
  );
}

export function AppNavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="ko-btn-ghost-light">
      {children}
    </Link>
  );
}
