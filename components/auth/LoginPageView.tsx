"use client";

import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { AuthShell } from "@/components/ui/AuthShell";

export function LoginPageView({
  next,
  reset,
}: {
  next?: string;
  reset?: string;
}) {
  const { t } = useLanguage();

  return (
    <AuthShell
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <>
          {reset === "1" ? (
            <p className="text-center text-sm font-semibold text-emerald-200">
              {t("auth.resetDone")}
            </p>
          ) : null}
          <p className="text-center text-sm ko-auth-muted">
            {t("auth.firstAccessPrompt")}{" "}
            <Link href="/first-access" className="ko-auth-link font-semibold">
              {t("auth.finishFirstAccess")}
            </Link>
          </p>
          <p className="text-center text-xs ko-auth-muted italic">
            {t("auth.forgotHint")}{" "}
            <Link href="/auth/reset-access" className="ko-auth-link not-italic">
              {t("auth.haveCode")}
            </Link>
          </p>
          <p className="text-center text-xs">
            <Link href="/" className="ko-auth-link">
              {t("chrome.backHome")}
            </Link>
          </p>
        </>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
