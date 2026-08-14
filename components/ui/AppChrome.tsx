import type { ReactNode } from "react";
import { AppNavLink, AppPageHeader } from "@/components/ui/AppPageHeader";

interface AppChromeProps {
  email?: string | null;
  title: string;
  subtitle?: string;
  nav?: ReactNode;
  children: ReactNode;
  /** Largeur max élargie (listes admin). */
  wide?: boolean;
}

/** Chrome partagé dashboard / admin : fond app + bandeau navy. */
export function AppChrome({
  email,
  title,
  subtitle,
  nav,
  children,
  wide = false,
}: AppChromeProps) {
  return (
    <div className="relative min-h-full flex-1 ko-app-bg">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[linear-gradient(180deg,#0b1f2a_0%,#123447_52%,transparent_100%)] opacity-95"
      />
      <div
        className={`relative mx-auto w-full px-4 py-8 sm:px-6 lg:px-8 ${
          wide ? "max-w-7xl" : "max-w-6xl"
        }`}
      >
        <AppPageHeader
          email={email}
          title={title}
          subtitle={subtitle}
          nav={nav}
        />
        <div className="ko-fade-up space-y-5">{children}</div>
      </div>
    </div>
  );
}

export { AppNavLink };
