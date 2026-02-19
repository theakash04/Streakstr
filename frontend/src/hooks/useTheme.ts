import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;

    if (stored) {
      setTheme(stored);
      document.documentElement.dataset.theme = stored;
    } else {
      const prefersLight = window.matchMedia(
        "(prefers-color-scheme: light)",
      ).matches;

      const systemTheme: Theme = prefersLight ? "light" : "dark";
      setTheme(systemTheme);
      document.documentElement.dataset.theme = systemTheme;
    }

    setMounted(true);
  }, []);

  // Update DOM + persist
  useEffect(() => {
    if (!mounted) return;

    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return {
    theme,
    toggleTheme,
    setTheme,
    isDark: theme === "dark",
    isLight: theme === "light",
    mounted,
  };
}
