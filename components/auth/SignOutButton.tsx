"use client";

import { useTransition } from "react";
import { signOutAction } from "@/lib/auth/actions";
import { useLanguage } from "@/components/i18n/LanguageProvider";

interface SignOutButtonProps {
  variant?: "light" | "dark" | "nav" | "mobile";
  className?: string;
}

function IconLogout({ className = "ko-icon" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export function SignOutButton({
  variant = "light",
  className = "",
}: SignOutButtonProps) {
  const [pending, startTransition] = useTransition();
  const { t } = useLanguage();
  const label = t("common.signOut");

  const styles =
    variant === "light"
      ? "rounded-md border border-white/20 px-3 py-1.5 text-white/90 transition hover:bg-white/10 disabled:opacity-60"
      : variant === "nav"
        ? "group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm font-semibold text-slate-500 transition-all duration-200 hover:translate-x-0.5 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
        : variant === "mobile"
          ? "flex w-full flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-60"
          : "rounded-md border border-slate-200 px-3 py-1.5 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

  return (
    <button
      type="button"
      disabled={pending}
      className={`${styles} ${className}`.trim()}
      onClick={() => startTransition(() => signOutAction())}
    >
      {variant === "nav" || variant === "mobile" ? (
        <>
          <span
            className={
              variant === "mobile"
                ? "text-slate-400"
                : "text-slate-400 transition-transform duration-300 group-hover:scale-110 group-hover:text-rose-600"
            }
          >
            <IconLogout className="ko-icon" />
          </span>
          {pending ? "…" : label}
        </>
      ) : pending ? (
        "…"
      ) : (
        label
      )}
    </button>
  );
}
