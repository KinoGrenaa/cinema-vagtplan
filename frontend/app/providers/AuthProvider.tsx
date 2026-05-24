"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { CurrentUser } from "../../../shared/types";

type AuthContextValue = {
  user: CurrentUser | null;
  token: string | null;
  loading: boolean;

  isMaster: boolean;
  isAdmin: boolean;
  isEmployee: boolean;

  login: (token: string, user: CurrentUser) => void;
  logout: () => void;
  refreshUser: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  function refreshUser() {
    try {
      const savedToken = localStorage.getItem("token");
      const savedUser = localStorage.getItem("user");

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } else {
        setToken(null);
        setUser(null);
      }
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshUser();
  }, []);

  function login(newToken: string, newUser: CurrentUser) {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);

    window.location.href = "/";
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,

      isMaster: user?.role === "MASTER",
      isAdmin: user?.role === "ADMIN" || user?.role === "MASTER",
      isEmployee: user?.role === "EMPLOYEE",

      login,
      logout,
      refreshUser,
    }),
    [user, token, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth skal bruges inde i AuthProvider");
  }

  return context;
}
