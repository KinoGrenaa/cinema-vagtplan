"use client";

import { useEffect, useState } from "react";

import {
  fetchCinemaStartOverview,
  getAuthenticatedStartPath,
} from "./components/cinema/cinemaStartOverview";
import InfoModal from "./components/modals/InfoModal";
import { useInfoModal } from "./hooks/useInfoModal";
import { useAuth } from "./providers/AuthProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const MASTER_SELECTED_CINEMA_ID_KEY =
  "masterSelectedCinemaId";
const MASTER_SELECTED_CINEMA_NAME_KEY =
  "masterSelectedCinemaName";
const MASTER_SELECTED_CINEMA_LOGO_URL_KEY =
  "masterSelectedCinemaLogoUrl";

type LoginDefaultCinema = {
  id: number;
  name: string;
  logoUrl?: string | null;
};

function applyMasterDefaultCinema(
  role: string,
  defaultCinema?: LoginDefaultCinema | null,
) {
  if (role !== "MASTER") return;

  if (!defaultCinema) {
    localStorage.removeItem(MASTER_SELECTED_CINEMA_ID_KEY);
    localStorage.removeItem(MASTER_SELECTED_CINEMA_NAME_KEY);
    localStorage.removeItem(MASTER_SELECTED_CINEMA_LOGO_URL_KEY);
    window.dispatchEvent(
      new Event("masterSelectedCinemaChanged"),
    );
    return;
  }

  localStorage.setItem(
    MASTER_SELECTED_CINEMA_ID_KEY,
    String(defaultCinema.id),
  );
  localStorage.setItem(
    MASTER_SELECTED_CINEMA_NAME_KEY,
    defaultCinema.name,
  );
  if (defaultCinema.logoUrl) {
    localStorage.setItem(
      MASTER_SELECTED_CINEMA_LOGO_URL_KEY,
      defaultCinema.logoUrl,
    );
  } else {
    localStorage.removeItem(
      MASTER_SELECTED_CINEMA_LOGO_URL_KEY,
    );
  }
  window.dispatchEvent(
    new Event("masterSelectedCinemaChanged"),
  );
}

async function readLoginError(response: Response) {
  let serverMessage = "";
  try {
    const data = await response.json();
    if (typeof data?.message === "string") {
      serverMessage = data.message;
    } else if (Array.isArray(data?.message)) {
      serverMessage = data.message.join("\n");
    }
  } catch {
    // Brug fallback hvis svaret ikke er JSON.
  }

  const normalizedMessage = serverMessage.toLowerCase();
  const isWrongCredentials =
    response.status === 400 ||
    response.status === 401 ||
    response.status === 403 ||
    normalizedMessage.includes("unauthorized") ||
    normalizedMessage.includes("invalid") ||
    normalizedMessage.includes("credentials") ||
    normalizedMessage.includes("password") ||
    normalizedMessage.includes("adgangskode") ||
    normalizedMessage.includes("forkert");

  if (isWrongCredentials) {
    return "E-mail eller adgangskode er forkert. Prøv igen.";
  }
  if (response.status >= 500) {
    return "Der er en midlertidig fejl på serveren. Prøv igen om lidt.";
  }
  return serverMessage.trim().length > 0
    ? serverMessage
    : "Login kunne ikke gennemføres. Prøv igen om lidt.";
}

async function routeAuthenticatedUser(role: string) {
  if (role === "MASTER") {
    window.location.href = "/dashboard";
    return;
  }

  try {
    const overview = await fetchCinemaStartOverview();
    window.location.href = getAuthenticatedStartPath(overview);
  } catch {
    window.location.href = "/home";
  }
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const {
    login,
    loading: authLoading,
    token,
    user,
  } = useAuth();
  const infoDialog = useInfoModal();
  const isAuthenticated = Boolean(token && user);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !user) return;
    void routeAuthenticatedUser(user.role);
  }, [authLoading, isAuthenticated, user]);

  if (authLoading || isAuthenticated) return null;

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoginLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        infoDialog.showError(
          "Login mislykkedes",
          await readLoginError(response),
        );
        return;
      }

      const data = await response.json();
      if (!data?.access_token || !data?.user) {
        infoDialog.showError(
          "Login mislykkedes",
          "Login lykkedes ikke, fordi serveren ikke sendte de nødvendige loginoplysninger. Prøv igen.",
        );
        return;
      }

      login(data.access_token, data.user);
      applyMasterDefaultCinema(
        data.user.role,
        data.defaultCinema,
      );
      await routeAuthenticatedUser(data.user.role);
    } catch {
      infoDialog.showError(
        "Kan ikke forbinde til serveren",
        "Der kunne ikke oprettes forbindelse til systemet. Tjek forbindelsen og prøv igen.",
      );
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <>
      <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-10 shadow-lg transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="mb-6 text-center text-3xl font-bold text-gray-950 dark:text-white">
            Cinema Vagtplan
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block font-medium">
                E-mail
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/25"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">
                Adgangskode
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-400/25"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-lg bg-blue-700 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:text-gray-700 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
            >
              {loginLoading ? "Logger ind..." : "Log ind"}
            </button>
          </form>
        </div>
      </main>
      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </>
  );
}
