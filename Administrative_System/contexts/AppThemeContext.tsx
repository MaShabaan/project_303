import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const THEME_STORAGE_KEY = "@app_theme";

export type AppThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  border: string;
  inputBg: string;
  inputBorder: string;
  accent: string;
  accentMuted: string;
};

type AppThemeContextValue = {
  isDark: boolean;
  toggleTheme: () => void;
  themeReady: boolean;
  colors: AppThemeColors;
};

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

function buildColors(isDark: boolean): AppThemeColors {
  if (isDark) {
    return {
      background: "#0f172a",
      surface: "#1e293b",
      surfaceMuted: "#334155",
      text: "#f8fafc",
      textSecondary: "#94a3b8",
      border: "#334155",
      inputBg: "#0f172a",
      inputBorder: "#475569",
      accent: "#a78bfa",
      accentMuted: "#4c1d95",
    };
  }
  return {
    background: "#f6f5ff",
    surface: "#ffffff",
    surfaceMuted: "#fafafa",
    text: "#1e1b4b",
    textSecondary: "#64748b",
    border: "#ede9fe",
    inputBg: "#ffffff",
    inputBorder: "#e2e8f0",
    accent: "#7c3aed",
    accentMuted: "#f5f3ff",
  };
}

function applyNativeColorScheme(isDarkMode: boolean) {
  const setter = (
    Appearance as typeof Appearance & {
      setColorScheme?: (scheme: "light" | "dark" | null) => void;
    }
  ).setColorScheme;
  try {
    setter?.(isDarkMode ? "dark" : "light");
  } catch {
    /* noop */
  }
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const dark = saved === "dark";
        if (!cancelled) {
          setIsDark(dark);
          applyNativeColorScheme(dark);
        }
      } finally {
        if (!cancelled) setThemeReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light").catch(() => {});
      applyNativeColorScheme(next);
      return next;
    });
  }, []);

  const colors = useMemo(() => buildColors(isDark), [isDark]);

  const value = useMemo(
    () => ({ isDark, toggleTheme, themeReady, colors }),
    [isDark, toggleTheme, themeReady, colors],
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext);
  if (!ctx) {
    throw new Error("useAppTheme must be used within AppThemeProvider");
  }
  return ctx;
}
