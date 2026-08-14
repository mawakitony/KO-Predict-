import type { ReactNode } from "react";

interface HeroBackdropProps {
  children: ReactNode;
  className?: string;
  /** Fond auth glass (dégradé profond) vs hero classique. */
  variant?: "default" | "auth";
}

/** Fond plein écran brandé (landing / auth). */
export function HeroBackdrop({
  children,
  className = "",
  variant = "default",
}: HeroBackdropProps) {
  const isAuth = variant === "auth";

  return (
    <div className={`relative flex min-h-full flex-1 flex-col ${className}`}>
      <div
        aria-hidden
        className={`pointer-events-none absolute inset-0 ${
          isAuth ? "ko-auth-bg" : "ko-hero-bg"
        }`}
      />
      {isAuth ? (
        <div aria-hidden className="pointer-events-none absolute inset-0 ko-auth-orbs" />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 ko-hero-mesh opacity-90"
        />
      )}
      <div className="relative z-10 flex min-h-full flex-1 flex-col">
        {children}
      </div>
    </div>
  );
}
