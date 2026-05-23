"use client";

import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type Cinema = {
  id: number;
  name: string;

  allowShiftTradePool: boolean;
  allowShiftTradeDirect: boolean;

  payrollRulesEnabled: boolean;

  payrollOvertimeEnabled: boolean;
  plannedOvertimeEnabled: boolean;
  dailyOvertimeEnabled: boolean;
  weeklyOvertimeEnabled: boolean;

  dailyOvertimeThreshold: number;
  weeklyOvertimeThreshold: number;
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
        setCinema(null);
        return;
      }

      const user: CurrentUser = JSON.parse(savedUser);

      const response = await fetch(`${API_URL}/cinemas/${user.cinemaId}`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error();
      }

      const data = await response.json();

      setCinema({
        payrollRulesEnabled: false,
        payrollOvertimeEnabled: false,
        plannedOvertimeEnabled: true,
        dailyOvertimeEnabled: false,
        weeklyOvertimeEnabled: false,
        dailyOvertimeThreshold: 8,
        weeklyOvertimeThreshold: 37,
        ...data,
      });
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

          payrollRulesEnabled: updatedCinema.payrollRulesEnabled,

          payrollOvertimeEnabled: updatedCinema.payrollOvertimeEnabled,

          plannedOvertimeEnabled: updatedCinema.plannedOvertimeEnabled,

          dailyOvertimeEnabled: updatedCinema.dailyOvertimeEnabled,

          weeklyOvertimeEnabled: updatedCinema.weeklyOvertimeEnabled,

          dailyOvertimeThreshold: updatedCinema.dailyOvertimeThreshold,

          weeklyOvertimeThreshold: updatedCinema.weeklyOvertimeThreshold,
        }),
      });

      if (!response.ok) {
        throw new Error();
      }

      const savedCinema = await response.json();

      setCinema({
        payrollRulesEnabled: false,
        payrollOvertimeEnabled: false,
        plannedOvertimeEnabled: true,
        dailyOvertimeEnabled: false,
        weeklyOvertimeEnabled: false,
        dailyOvertimeThreshold: 8,
        weeklyOvertimeThreshold: 37,
        ...savedCinema,
      });

      setMessage("Biografindstillinger gemt.");
    } catch {
      setMessage("Kunne ikke gemme indstillinger.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-gray-100 p-4 dark:bg-gray-950 md:p-8">
          <div className="mx-auto max-w-4xl text-gray-900 dark:text-gray-100">
            Indlæser...
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!cinema) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-gray-100 p-4 dark:bg-gray-950 md:p-8">
          <div className="mx-auto max-w-4xl rounded-2xl border border-red-200 bg-white p-6 text-red-600 shadow-sm dark:border-red-900 dark:bg-gray-900">
            {message || "Kunne ikke hente biograf."}
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
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
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-6 text-2xl font-bold">Lønregler & overtime</h2>

            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div>
                  <div className="font-semibold">Brug avancerede lønregler</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Splitter automatisk timer i weekend, aften og nat.
                  </div>
                </div>

                <button
                  onClick={() =>
                    updateCinemaSettings({
                      ...cinema,
                      payrollRulesEnabled: !cinema.payrollRulesEnabled,
                    })
                  }
                  disabled={saving}
                  className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    cinema.payrollRulesEnabled
                      ? "bg-purple-600 hover:bg-purple-700"
                      : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  {cinema.payrollRulesEnabled ? "Aktiveret" : "Deaktiveret"}
                </button>
              </div>

              <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div>
                  <div className="font-semibold">Brug overtime system</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Aktiverer overtime regler i løneksport.
                  </div>
                </div>

                <button
                  onClick={() =>
                    updateCinemaSettings({
                      ...cinema,
                      payrollOvertimeEnabled: !cinema.payrollOvertimeEnabled,
                    })
                  }
                  disabled={saving}
                  className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    cinema.payrollOvertimeEnabled
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-gray-600 hover:bg-gray-700"
                  }`}
                >
                  {cinema.payrollOvertimeEnabled ? "Aktiveret" : "Deaktiveret"}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="font-semibold">Planned overtime</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Over planlagt vagt.
                  </div>

                  <input
                    type="checkbox"
                    checked={cinema.plannedOvertimeEnabled}
                    onChange={(event) =>
                      updateCinemaSettings({
                        ...cinema,
                        plannedOvertimeEnabled: event.target.checked,
                      })
                    }
                    className="mt-4 h-5 w-5"
                  />
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="font-semibold">Daily overtime</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Mere end X timer pr dag.
                  </div>

                  <input
                    type="checkbox"
                    checked={cinema.dailyOvertimeEnabled}
                    onChange={(event) =>
                      updateCinemaSettings({
                        ...cinema,
                        dailyOvertimeEnabled: event.target.checked,
                      })
                    }
                    className="mt-4 h-5 w-5"
                  />
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="font-semibold">Weekly overtime</div>

                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Mere end X timer pr uge.
                  </div>

                  <input
                    type="checkbox"
                    checked={cinema.weeklyOvertimeEnabled}
                    onChange={(event) =>
                      updateCinemaSettings({
                        ...cinema,
                        weeklyOvertimeEnabled: event.target.checked,
                      })
                    }
                    className="mt-4 h-5 w-5"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="font-semibold">Daglig overtime grænse</div>

                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={cinema.dailyOvertimeThreshold}
                    onChange={(event) =>
                      setCinema({
                        ...cinema,
                        dailyOvertimeThreshold: Number(event.target.value),
                      })
                    }
                    onBlur={() => updateCinemaSettings(cinema)}
                    className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <div className="font-semibold">Ugentlig overtime grænse</div>

                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={cinema.weeklyOvertimeThreshold}
                    onChange={(event) =>
                      setCinema({
                        ...cinema,
                        weeklyOvertimeThreshold: Number(event.target.value),
                      })
                    }
                    onBlur={() => updateCinemaSettings(cinema)}
                    className="mt-3 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>
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
    </AdminGuard>
  );
}
