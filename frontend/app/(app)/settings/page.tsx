"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/components/ThemeProvider";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type CurrentUser = {
  id: number;
  role: string;
  cinemaId: number;
};

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [allowPool, setAllowPool] = useState(false);
  const [allowDirect, setAllowDirect] = useState(false);
  const [message, setMessage] = useState("");

  function getToken() {
    return localStorage.getItem("token");
  }

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setCurrentUser(parsedUser);
      fetchSettings(parsedUser);
    }
  }, []);

  async function fetchSettings(user: CurrentUser) {
    try {
      const response = await fetch(`${API_URL}/cinemas/${user.cinemaId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();

      setAllowPool(Boolean(data.allowShiftTradePool));
      setAllowDirect(Boolean(data.allowShiftTradeDirect));
    } catch {
      setMessage("Kunne ikke hente indstillinger");
    }
  }

  async function saveSettings() {
    if (!currentUser) return;

    const response = await fetch(`${API_URL}/cinemas/${currentUser.cinemaId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        allowShiftTradePool: allowPool,
        allowShiftTradeDirect: allowDirect,
      }),
    });

    if (!response.ok) {
      setMessage("Kunne ikke gemme indstillinger");
      return;
    }

    setMessage("Indstillinger gemt");
  }

  if (!currentUser) {
    return (
      <main className="p-10 text-gray-900 dark:text-gray-100">Indlæser...</main>
    );
  }

  const isAdmin = currentUser.role === "ADMIN" || currentUser.role === "MASTER";

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      <div className="max-w-4xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
          <h1 className="text-3xl font-bold mb-2">Indstillinger</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Tilpas systemet og dine personlige visningsindstillinger.
          </p>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h2 className="text-xl font-bold">Udseende</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vælg om systemet skal vises i lyst eller mørkt tema.
              </p>
            </div>

            <div className="flex rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  theme === "light"
                    ? "bg-white text-black shadow-sm dark:bg-gray-700 dark:text-white"
                    : "text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                <Sun size={16} />
                Lys
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                  theme === "dark"
                    ? "bg-black text-white shadow-sm dark:bg-white dark:text-black"
                    : "text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                <Moon size={16} />
                Mørk
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            Dit valg gemmes på din bruger og følger dig på tværs af enheder.
          </div>
        </section>

        {isAdmin && (
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 dark:bg-gray-900 dark:border-gray-800">
            <h2 className="text-xl font-bold mb-2">Vagtbytte</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Styr hvilke vagtbytte-funktioner personalet må bruge.
            </p>

            <div className="space-y-4">
              <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <span>
                  <span className="block font-medium">
                    Personalet må sende vagter til fælles pulje
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Vagter kan lægges åbent ud, så andre medarbejdere kan tage dem.
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={allowPool}
                  onChange={(e) => setAllowPool(e.target.checked)}
                  className="h-5 w-5"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <span>
                  <span className="block font-medium">
                    Personalet må sende vagter direkte til kollegaer
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Vagter kan tilbydes direkte til én bestemt medarbejder.
                  </span>
                </span>

                <input
                  type="checkbox"
                  checked={allowDirect}
                  onChange={(e) => setAllowDirect(e.target.checked)}
                  className="h-5 w-5"
                />
              </label>
            </div>

            <button
              onClick={saveSettings}
              className="mt-6 rounded-xl bg-black px-6 py-3 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              Gem indstillinger
            </button>

            {message && (
              <div className="mt-4 rounded-xl bg-gray-100 p-3 text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {message}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}