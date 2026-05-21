"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const ThemeContext = createContext<ThemeContextValue | null>(null);

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>("light");

  function applyTheme(nextTheme: Theme) {
    setThemeState(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  }

  useEffect(() => {
    async function loadTheme() {
      const savedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!savedUser || !token) {
        applyTheme("light");
        return;
      }

      const user = JSON.parse(savedUser);

      const userTheme = user.theme === "dark" ? "dark" : "light";
      applyTheme(userTheme);
    }

    loadTheme();
  }, []);

  async function saveThemeToUser(nextTheme: Theme) {
    const savedUser = localStorage.getItem("user");
    const token = localStorage.getItem("token");

    if (!savedUser || !token) return;

    const user = JSON.parse(savedUser);

    const response = await fetch(`${API_URL}/users/${user.id}/theme`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        theme: nextTheme,
      }),
    });

    if (!response.ok) return;

    const updatedUser = await response.json();

    localStorage.setItem("user", JSON.stringify(updatedUser));
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

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme skal bruges inde i ThemeProvider");
  }

  return context;
}