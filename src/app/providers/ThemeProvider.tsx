import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import {
  auth,
  db,
  updateUserThemePreference,
} from "@services/firebase/firebase";
import type { ThemeMode } from "../../types/common";

type Theme = "light" | "dark";

const THEME_OPTIONS: ThemeMode[] = ["light", "dark", "system"];

const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === "string" && THEME_OPTIONS.includes(value as ThemeMode);

const resolveTheme = (themeMode: ThemeMode, prefersDark: boolean): Theme =>
  themeMode === "system" ? (prefersDark ? "dark" : "light") : themeMode;

interface ThemeContextType {
  themeMode: ThemeMode;
  theme: Theme;
  setThemeMode: (themeMode: ThemeMode) => Promise<void>;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    try {
      const stored = localStorage.getItem("sgroups:theme");
      return isThemeMode(stored) ? stored : "system";
    } catch (e) {
      return "system";
    }
  });
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches);
    };

    setPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      unsubscribeUserDoc?.();

      if (!currentUser) {
        setThemeModeState("system");
        return;
      }

      unsubscribeUserDoc = onSnapshot(
        doc(db, "users", currentUser.uid),
        (snapshot) => {
          const savedTheme = snapshot.data()?.theme;
          setThemeModeState(isThemeMode(savedTheme) ? savedTheme : "system");
        },
      );
    });

    return () => {
      unsubscribeUserDoc?.();
      unsubscribeAuth();
    };
  }, []);

  const theme = resolveTheme(themeMode, prefersDark);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setThemeMode = useCallback(async (nextThemeMode: ThemeMode) => {
    setThemeModeState(nextThemeMode);
    try {
      localStorage.setItem("sgroups:theme", nextThemeMode);
    } catch (e) {
      /* ignore */
    }

    if (auth.currentUser) {
      try {
        await updateUserThemePreference(auth.currentUser.uid, nextThemeMode);
      } catch (error) {
        console.error("Failed to persist theme preference", error);
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    void setThemeMode(theme === "light" ? "dark" : "light");
  }, [setThemeMode, theme]);

  return (
    <ThemeContext.Provider
      value={{ themeMode, theme, setThemeMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
