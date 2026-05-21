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
  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [allowPool, setAllowPool] = useState(false);

  const [allowDirect, setAllowDirect] = useState(false);

  const [message, setMessage] = useState("");

  const { theme, setTheme } = useTheme();

  function getToken() {
    return localStorage.getItem("token");
  }

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }

    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) return;

      const user: CurrentUser = JSON.parse(savedUser);

      const response = await fetch(
        `${API_URL}/cinemas/${user.cinemaId}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) return;

      const data = await response.json();

      setAllowPool(Boolean(data.allowShiftTradePool));

      setAllowDirect(Boolean(data.allowShiftTradeDirect));
    } catch {
      setAllowPool(false);
      setAllowDirect(false);
    }
  }

  async function saveSettings() {
    if (!currentUser) return;

    setMessage("");

    const response = await fetch(
      `${API_URL}/cinemas/${currentUser.cinemaId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          allowShiftTradePool: allowPool,
          allowShiftTradeDirect: allowDirect,
        }),
      },
    );

    if (!response.ok) {
      setMessage("Kunne ikke gemme indstillinger");
      return;
    }

    setMessage("Indstillinger gemt");
  }

  if (!currentUser) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        Indlæser...
      </main>
    );
  }

  if (
    currentUser.role !== "ADMIN" &&
    currentUser.role !== "MASTER"
  ) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        Ingen adgang
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Indstillinger</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Administrer systemets funktioner og udseende.
          </p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-6 flex items-center gap-3">
            {theme === "dark" ? (
              <Moon className="h-6 w-6" />
            ) : (
              <Sun className="h-6 w-6" />
            )}

            <div>
              <h2 className="text-2xl font-bold">
                Tema
              </h2>

              <p className="text-gray-500 dark:text-gray-400">
                Vælg mellem lyst og mørkt tema.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`rounded-xl px-5 py-3 font-medium transition ${
                theme === "light"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              Lyst tema
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={`rounded-xl px-5 py-3 font-medium transition ${
                theme === "dark"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              Mørkt tema
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-2 text-2xl font-bold">
            Vagtbytte
          </h2>

          <p className="mb-6 text-gray-500 dark:text-gray-400">
            Styr hvilke vagtbytte-funktioner medarbejdere må bruge.
          </p>

          <div className="space-y-4">
            <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 transition dark:border-gray-800 dark:bg-gray-950">
              <div>
                <div className="font-medium">
                  Fælles vagtpulje
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Medarbejdere kan sende vagter til fælles pulje.
                </div>
              </div>

              <input
                type="checkbox"
                checked={allowPool}
                onChange={(e) =>
                  setAllowPool(e.target.checked)
                }
                className="h-5 w-5"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 transition dark:border-gray-800 dark:bg-gray-950">
              <div>
                <div className="font-medium">
                  Direkte vagtbytte
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Medarbejdere kan sende vagter direkte til
                  kollegaer.
                </div>
              </div>

              <input
                type="checkbox"
                checked={allowDirect}
                onChange={(e) =>
                  setAllowDirect(e.target.checked)
                }
                className="h-5 w-5"
              />
            </label>
          </div>

          <button
            onClick={saveSettings}
            className="mt-6 rounded-xl bg-black px-6 py-3 font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Gem indstillinger
          </button>

          {message && (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
              {message}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}