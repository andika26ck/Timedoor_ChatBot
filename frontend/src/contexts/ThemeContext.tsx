import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useLocalStorage } from "../features/chat/hooks/useLocalStorage";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemPref(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Kumpulkan semua "root tema" yang harus diberi class `dark`.
 *
 * PENTING: widget embed dirender di dalam Shadow DOM. CSS di shadow root
 * tidak bisa mencocokkan ancestor di luar shadow boundary, jadi menempelkan
 * class `dark` hanya di <html> membuat semua varian `dark:` mati di widget.
 * Karena itu container widget diberi atribut [data-theme-root] dan ikut
 * di-toggle di sini.
 */
function collectRoots(): Element[] {
  const roots: Element[] = [];
  if (typeof document === "undefined") return roots;
  roots.push(document.documentElement);
  document.querySelectorAll("[data-theme-root]").forEach((el) => roots.push(el));
  // Container di dalam shadow root milik host widget.
  document.querySelectorAll("[data-td-chatbot-host]").forEach((host) => {
    const shadow = (host as HTMLElement).shadowRoot;
    shadow?.querySelectorAll("[data-theme-root]").forEach((el) => roots.push(el));
  });
  return roots;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useLocalStorage<Theme>("tdc:theme", getSystemPref());

  const applyTheme = useCallback((next: Theme) => {
    collectRoots().forEach((root) => {
      root.classList.toggle("dark", next === "dark");
    });
  }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Kalau container widget baru muncul belakangan, tetap ikut tema aktif.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const obs = new MutationObserver(() => applyTheme(theme));
    obs.observe(document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [theme, applyTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDark: theme === "dark",
      setTheme,
      toggle: () => setTheme((prev) => (prev === "dark" ? "light" : "dark")),
    }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme harus dipakai di dalam <ThemeProvider>");
  return ctx;
}
