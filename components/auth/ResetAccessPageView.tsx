"use client";

import Link from "next/link";
import { ResetAccessForm } from "@/components/auth/ResetAccessForm";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { AuthShell } from "@/components/ui/AuthShell";

export function ResetAccessPageView() {
  const { t } = useLanguage();

  return (
    <AuthShell
      title={t("auth.resetTitle")}
      subtitle={t("auth.resetSubtitle")}
      footer={
        <p className="text-center text-sm">
          <Link href="/login" className="ko-auth-link font-semibold">
            {t("auth.backLogin")}
          </Link>
        </p>
      }
    >
      <ResetAccessForm />
    </AuthShell>
  );
}
