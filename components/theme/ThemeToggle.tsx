"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { isDark, toggle } = useTheme();
  const { t } = useLanguage();
  const label = t("common.darkMode");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={label}
      title={label}
      onClick={toggle}
      className={`ko-theme-toggle${compact ? " is-compact" : ""}`}
      suppressHydrationWarning
    >
      <span className="ko-theme-toggle-label">{label}</span>
      <span className="ko-theme-switch" aria-hidden>
        <span className="ko-theme-switch-thumb" />
      </span>
    </button>
  );
}
