"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/app/lib/api";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>("light");

  function applyTheme(nextTheme: Theme) {
    setThemeState(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("theme");

      if (isTheme(savedTheme)) {
        applyTheme(savedTheme);
        return;
      }

      const savedUser = localStorage.getItem("user");

      if (savedUser) {
        const user = JSON.parse(savedUser);
        const userTheme = isTheme(user.theme) ? user.theme : "light";

        applyTheme(userTheme);
        return;
      }

      applyTheme("light");
    } catch {
      applyTheme("light");
    }
  }, []);

  async function saveThemeToUser(nextTheme: Theme) {
    try {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) return;

      const user = JSON.parse(savedUser);

      const response = await apiFetch(`/users/${user.id}/theme`, {
        method: "PATCH",
        body: JSON.stringify({
          theme: nextTheme,
        }),
      });

      if (!response.ok) return;

      const updatedUser = await response.json();

      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch {
      // Theme er allerede gemt lokalt, så vi fejler stille her.
    }
  }

  function setTheme(nextTheme: Theme) {
    applyTheme(nextTheme);
    saveThemeToUser(nextTheme);
  }

  function toggleTheme() {
    setTheme(theme === "dark" ? "light" : "dark");
  }

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
    }),
    [theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme skal bruges inde i ThemeProvider");
  }

  return context;
}
