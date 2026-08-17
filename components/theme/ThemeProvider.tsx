"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  THEME_STORAGE_KEY,
  isThemeChoice,
  resolveTheme,
  type ThemeChoice,
} from "@/lib/theme/storage";

type ThemeContextValue = {
  theme: ThemeChoice;
  isDark: boolean;
  toggle: () => void;
  setTheme: (theme: ThemeChoice) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredChoice(): ThemeChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : null;
  } catch {
    return null;
  }
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readDomTheme(): ThemeChoice | null {
  if (typeof document === "undefined") return null;
  const attr = document.documentElement.getAttribute("data-theme");
  return isThemeChoice(attr) ? attr : null;
}

function applyTheme(theme: ThemeChoice) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("light");
  const [hasChoice, setHasChoice] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = readStoredChoice();
    const resolved =
      readDomTheme() ?? resolveTheme(stored, systemPrefersDark());
    setHasChoice(stored != null);
    setThemeState(resolved);
    applyTheme(resolved);
  }, []);

  useEffect(() => {
    if (hasChoice !== false) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next: ThemeChoice = media.matches ? "dark" : "light";
      setThemeState(next);
      applyTheme(next);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [hasChoice]);

  const setTheme = useCallback((next: ThemeChoice) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* quota / mode privé */
    }
    setHasChoice(true);
    setThemeState(next);
    applyTheme(next);
  }, []);

  const toggle = useCallback(() => {
    const current = readDomTheme() ?? theme;
    setTheme(current === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === "dark",
      toggle,
      setTheme,
    }),
    [theme, toggle, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme doit être utilisé dans ThemeProvider.");
  }
  return ctx;
}
