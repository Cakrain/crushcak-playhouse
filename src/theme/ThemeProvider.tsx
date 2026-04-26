import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

export type ThemeName = "lacivert" | "siyah" | "mavi" | "su_yesili";

export const THEMES: { id: ThemeName; labelKey: string; preview: string; accent: string }[] = [
  { id: "lacivert", labelKey: "theme.lacivert", preview: "#0a1628", accent: "#22e9b0" },
  { id: "siyah", labelKey: "theme.siyah", preview: "#0d0d0d", accent: "#f5c842" },
  { id: "mavi", labelKey: "theme.mavi", preview: "#0d1b4b", accent: "#33b6ff" },
  { id: "su_yesili", labelKey: "theme.su_yesili", preview: "#0d3b3b", accent: "#3deec6" },
];

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  hasOnboarded: boolean;
  completeOnboarding: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = "crushcak.theme";
const ONBOARD_KEY = "crushcak.onboarded";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "lacivert";
    const saved = window.localStorage.getItem(THEME_KEY) as ThemeName | null;
    return saved && THEMES.some((t) => t.id === saved) ? saved : "lacivert";
  });

  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(ONBOARD_KEY) === "1";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.add("dark"); // Always dark variants
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeName) => setThemeState(t), []);
  const completeOnboarding = useCallback(() => {
    window.localStorage.setItem(ONBOARD_KEY, "1");
    setHasOnboarded(true);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, hasOnboarded, completeOnboarding }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
