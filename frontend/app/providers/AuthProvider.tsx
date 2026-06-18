"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { CurrentUser } from "../../../shared/types";
import BaseModal from "../components/modals/BaseModal";
import { SESSION_EXPIRED_EVENT } from "../lib/api";
const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";
const MASTER_SELECTED_CINEMA_NAME_KEY = "masterSelectedCinemaName";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiredOpen, setSessionExpiredOpen] = useState(false);

  function clearAuthState() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem(MASTER_SELECTED_CINEMA_ID_KEY);
    localStorage.removeItem(MASTER_SELECTED_CINEMA_NAME_KEY);
    window.dispatchEvent(new Event("masterSelectedCinemaChanged"));

    setToken(null);
    setUser(null);
  }

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

  useEffect(() => {
    function handleSessionExpired() {
      clearAuthState();

      if (window.location.pathname === "/") {
        return;
      }

      setSessionExpiredOpen(true);
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, []);

  function login(newToken: string, newUser: CurrentUser) {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    if (newUser.role === "MASTER") {
      localStorage.removeItem(MASTER_SELECTED_CINEMA_ID_KEY);
      localStorage.removeItem(MASTER_SELECTED_CINEMA_NAME_KEY);
      window.dispatchEvent(new Event("masterSelectedCinemaChanged"));
    }

    setToken(newToken);
    setUser(newUser);
    setSessionExpiredOpen(false);
  }

  function logout() {
    clearAuthState();

    window.location.href = "/";
  }

  function goToLoginAfterSessionExpired() {
    setSessionExpiredOpen(false);
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

  return (
    <AuthContext.Provider value={value}>
      {children}

      <BaseModal
        open={sessionExpiredOpen}
        title="Din session er udløbet"
        onClose={goToLoginAfterSessionExpired}
        width="sm"
      >
        <div className="space-y-5">
          <p className="text-gray-700 dark:text-gray-300">
            Du skal logge ind igen for at fortsætte.
          </p>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={goToLoginAfterSessionExpired}
              className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
            >
              Log ind igen
            </button>
          </div>
        </div>
      </BaseModal>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth skal bruges inde i AuthProvider");
  }

  return context;
}
