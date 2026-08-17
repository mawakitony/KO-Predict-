"use client";

import Link from "next/link";
import { FirstAccessForm } from "@/components/auth/FirstAccessForm";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { AuthShell } from "@/components/ui/AuthShell";

export function FirstAccessPageView() {
  const { t } = useLanguage();

  return (
    <AuthShell
      title={t("auth.firstAccessTitle")}
      subtitle={t("auth.firstAccessSubtitle")}
      footer={
        <p className="text-center text-sm">
          <Link href="/login" className="ko-auth-link font-semibold">
            {t("auth.alreadyPassword")}
          </Link>
        </p>
      }
    >
      <FirstAccessForm />
    </AuthShell>
  );
}
