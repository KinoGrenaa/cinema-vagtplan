"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Cinema = {
  id: number;
  name: string;
  allowShiftTradePool: boolean;
  allowShiftTradeDirect: boolean;
};

type CurrentUser = {
  id: number;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number;
};

export default function CinemaSettingsPage() {
  const [cinema, setCinema] = useState<Cinema | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isAllowed, setIsAllowed] = useState(false);

  function getHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    };
  }

  const fetchCinema = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        setIsAllowed(false);
        return;
      }

      const user: CurrentUser = JSON.parse(savedUser);

      if (user.role !== "ADMIN" && user.role !== "MASTER") {
        setIsAllowed(false);
        return;
      }

      setIsAllowed(true);

      const response = await fetch(`${API_URL}/cinemas/${user.cinemaId}`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      setCinema(data);
    } catch {
      setMessage("Kunne ikke hente biografindstillinger.");
      setCinema(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCinema();
  }, [fetchCinema]);

  async function updateCinemaSettings(updatedCinema: Cinema) {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetch(`${API_URL}/cinemas/${updatedCinema.id}`, {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          allowShiftTradePool: updatedCinema.allowShiftTradePool,
          allowShiftTradeDirect: updatedCinema.allowShiftTradeDirect,
        }),
      });

      if (!response.ok) {
        throw new Error();
      }

      const savedCinema = await response.json();

      setCinema(savedCinema);
      setMessage("Biografindstillinger gemt.");
    } catch {
      setMessage("Kunne ikke gemme indstillinger.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 dark:bg-gray-950 md:p-8">
        <div className="mx-auto max-w-4xl text-gray-900 dark:text-gray-100">
          Indlæser...
        </div>
      </main>
    );
  }

  if (!isAllowed) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 dark:bg-gray-950 md:p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-6 text-red-600 shadow-sm dark:border-red-900 dark:bg-gray-900">
          Du har ikke adgang til biografindstillinger.
        </div>
      </main>
    );
  }

  if (!cinema) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 dark:bg-gray-950 md:p-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-6 text-red-600 shadow-sm dark:border-red-900 dark:bg-gray-900">
          {message || "Kunne ikke hente biograf."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Biograf indstillinger</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Administrer funktioner og regler for hele biografen.
          </p>

          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {cinema.name}
          </p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-6 text-2xl font-bold">Vagtbytte-funktioner</h2>

          <div className="space-y-5">
            <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div>
                <div className="font-semibold">Tillad vagtpulje</div>

                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Medarbejdere kan sende vagter ud i den åbne vagtpulje.
                </div>
              </div>

              <button
                onClick={() =>
                  updateCinemaSettings({
                    ...cinema,
                    allowShiftTradePool: !cinema.allowShiftTradePool,
                  })
                }
                disabled={saving}
                className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  cinema.allowShiftTradePool
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                {cinema.allowShiftTradePool ? "Aktiveret" : "Deaktiveret"}
              </button>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div>
                <div className="font-semibold">Tillad direkte vagtbytter</div>

                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Medarbejdere kan tilbyde vagter direkte til specifikke
                  brugere.
                </div>
              </div>

              <button
                onClick={() =>
                  updateCinemaSettings({
                    ...cinema,
                    allowShiftTradeDirect: !cinema.allowShiftTradeDirect,
                  })
                }
                disabled={saving}
                className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  cinema.allowShiftTradeDirect
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                {cinema.allowShiftTradeDirect ? "Aktiveret" : "Deaktiveret"}
              </button>
            </div>
          </div>

          {message && (
            <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
              {message}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
