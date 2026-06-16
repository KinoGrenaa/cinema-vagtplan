"use client";

import { useState } from "react";
import InfoModal from "./components/modals/InfoModal";
import { useInfoModal } from "./hooks/useInfoModal";
import { useAuth } from "./providers/AuthProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

async function readLoginError(response: Response) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      const message = data.message.toLowerCase();

      if (
        response.status === 401 ||
        message.includes("unauthorized") ||
        message.includes("invalid") ||
        message.includes("forkert")
      ) {
        return "E-mail eller adgangskode er forkert. Prøv igen.";
      }

      return data.message;
    }
  } catch {}

  if (response.status === 401) {
    return "E-mail eller adgangskode er forkert. Prøv igen.";
  }

  return "Login kunne ikke gennemføres. Prøv igen om lidt.";
}

export default function HomePage() {
  const [email, setEmail] = useState("admin@test.dk");
  const [password, setPassword] = useState("test123");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const infoDialog = useInfoModal();

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

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
      setLoading(false);
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
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 disabled:bg-gray-400"
            >
              {loading ? "Logger ind..." : "Log ind"}
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
