"use client";

import { useEffect, useState } from "react";
import InfoModal from "./components/modals/InfoModal";
import { useInfoModal } from "./hooks/useInfoModal";
import { useAuth } from "./providers/AuthProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

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

  if (serverMessage.trim().length > 0) {
    return serverMessage;
  }

  return "Login kunne ikke gennemføres. Prøv igen om lidt.";
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const { login, loading: authLoading, token, user } = useAuth();
  const infoDialog = useInfoModal();
  const isAuthenticated = Boolean(token && user);

  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      return;
    }

    window.location.href = "/dashboard";
  }, [authLoading, isAuthenticated]);

  if (authLoading || isAuthenticated) {
    return null;
  }

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

      window.location.href = "/dashboard";
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
      <main className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Cinema Vagtplan
          </h1>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">Email</label>
              <input
                type="email"
                className="w-full border rounded-lg px-4 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">Password</label>
              <input
                type="password"
                className="w-full border rounded-lg px-4 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
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
