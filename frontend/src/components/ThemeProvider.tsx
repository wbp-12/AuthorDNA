import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type ThemeMode = "light" | "dark";
type ThemePreference = ThemeMode | "system";

type ThemeContextValue = {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const THEME_STORAGE_KEY = "theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ThemeMode {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredPreference(): ThemePreference | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark" || stored === "light" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore
  }

  return null;
}

function resolvePreference(): ThemePreference {
  return getStoredPreference() ?? "system";
}

function resolveTheme(preference: ThemePreference, systemTheme: ThemeMode): ThemeMode {
  return preference === "system" ? systemTheme : preference;
}

export function initializeTheme() {
  const preference = resolvePreference();
  document.documentElement.dataset.theme = resolveTheme(preference, getSystemTheme());
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themePreference, setThemePreference] = useState<ThemePreference>(resolvePreference);
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(getSystemTheme);

  const theme = resolveTheme(themePreference, systemTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      if (themePreference === "system") {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, themePreference);
      }
    } catch {
      // ignore
    }
  }, [theme, themePreference]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      if (event.newValue === "dark" || event.newValue === "light" || event.newValue === "system") {
        setThemePreference(event.newValue);
        return;
      }

      if (event.newValue === null) {
        setThemePreference("system");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme: (nextTheme) => setThemePreference(nextTheme),
      toggleTheme: () => setThemePreference((current) => (resolveTheme(current, systemTheme) === "dark" ? "light" : "dark")),
    }),
    [systemTheme, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}