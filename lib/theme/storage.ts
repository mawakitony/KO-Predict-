export const THEME_STORAGE_KEY = "ko-predict-theme";

export type ThemeChoice = "light" | "dark";

export function isThemeChoice(value: string | null | undefined): value is ThemeChoice {
  return value === "light" || value === "dark";
}

/** Résout le thème : choix stocké, sinon système. */
export function resolveTheme(
  stored: string | null | undefined,
  systemDark: boolean,
): ThemeChoice {
  if (isThemeChoice(stored)) return stored;
  return systemDark ? "dark" : "light";
}

export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var s=localStorage.getItem(k);var d=s==="dark"||(s!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");}catch(e){}})();`;
