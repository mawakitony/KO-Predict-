"use client";

import type { KeyboardEvent } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Locale } from "@/lib/i18n/storage";

const OPTIONS: {
  value: Locale;
  code: "FR" | "EN";
  labelKey: "common.languageFr" | "common.languageEn";
}[] = [
  { value: "fr", code: "FR", labelKey: "common.languageFr" },
  { value: "en", code: "EN", labelKey: "common.languageEn" },
];

export function LanguageToggle() {
  const { locale, setLocale, t } = useLanguage();

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = OPTIONS.findIndex((option) => option.value === locale);
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = OPTIONS[(index + delta + OPTIONS.length) % OPTIONS.length];
    setLocale(next.value);
  }

  return (
    <div
      className="ko-lang-toggle"
      role="radiogroup"
      aria-label={t("common.language")}
      onKeyDown={onKeyDown}
    >
      {OPTIONS.map((option) => {
        const checked = locale === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={t(option.labelKey)}
            title={t(option.labelKey)}
            tabIndex={checked ? 0 : -1}
            className="ko-lang-toggle-option"
            onClick={() => setLocale(option.value)}
          >
            {option.code}
          </button>
        );
      })}
    </div>
  );
}
