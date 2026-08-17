"use client";

import Link from "next/link";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { MessageKey, TranslateParams } from "@/lib/i18n/translate";

export function TranslatedText({
  messageKey,
  params,
  className,
  as: Tag = "p",
}: {
  messageKey: MessageKey;
  params?: TranslateParams;
  className?: string;
  as?: "p" | "span" | "h1" | "h2";
}) {
  const { t } = useLanguage();
  return <Tag className={className}>{t(messageKey, params)}</Tag>;
}

export function TranslatedLink({
  href,
  messageKey,
  className,
}: {
  href: string;
  messageKey: MessageKey;
  className?: string;
}) {
  const { t } = useLanguage();
  return (
    <Link href={href} className={className}>
      {t(messageKey)}
    </Link>
  );
}
