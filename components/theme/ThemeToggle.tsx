"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Mode sombre"
      title="Mode sombre"
      onClick={toggle}
      className={`ko-theme-toggle${compact ? " is-compact" : ""}`}
      suppressHydrationWarning
    >
      <span className="ko-theme-toggle-label">Mode sombre</span>
      <span className="ko-theme-switch" aria-hidden>
        <span className="ko-theme-switch-thumb" />
      </span>
    </button>
  );
}
