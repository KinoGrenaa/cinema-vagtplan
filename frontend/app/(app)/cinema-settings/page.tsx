"use client";

import { useCallback, useEffect, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type PayrollPeriodModel = "CALENDAR_MONTH" | "FIXED_DAY_TO_DAY" | "BIWEEKLY";

type PayrollPayoutRule = "LAST_WEEKDAY_OF_MONTH" | "FIXED_DAY_OF_MONTH";

type Cinema = {
  id: number;
  name: string;

  allowShiftTradePool: boolean;
  allowShiftTradeDirect: boolean;

  aiEnabled: boolean;

  payrollRulesEnabled: boolean;

  payrollOvertimeEnabled: boolean;
  plannedOvertimeEnabled: boolean;
  dailyOvertimeEnabled: boolean;
  weeklyOvertimeEnabled: boolean;

  dailyOvertimeThreshold: number;
  weeklyOvertimeThreshold: number;

  payrollPeriodModel: PayrollPeriodModel;
  payrollPeriodStartDay: number;
  payrollPeriodEndDay: number;
  payrollPeriodAnchorDate: string | null;

  payrollPayoutRule: PayrollPayoutRule;
  payrollPayoutDay: number;
};

type CurrentUser = {
  id: number;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number;
};

const CINEMA_DEFAULTS = {
  aiEnabled: false,
  payrollRulesEnabled: false,
  payrollOvertimeEnabled: false,
  plannedOvertimeEnabled: true,
  dailyOvertimeEnabled: false,
  weeklyOvertimeEnabled: false,
  dailyOvertimeThreshold: 8,
  weeklyOvertimeThreshold: 37,
  payrollPeriodModel: "CALENDAR_MONTH" as PayrollPeriodModel,
  payrollPeriodStartDay: 1,
  payrollPeriodEndDay: 31,
  payrollPeriodAnchorDate: null as string | null,
  payrollPayoutRule: "LAST_WEEKDAY_OF_MONTH" as PayrollPayoutRule,
  payrollPayoutDay: 0,
};

function clampDay(value: number) {
  if (Number.isNaN(value)) return 1;
  return Math.min(31, Math.max(1, value));
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateDk(date: Date) {
  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function dateWithSafeDay(year: number, monthIndex: number, day: number) {
  return new Date(
    year,
    monthIndex,
    Math.min(day, daysInMonth(year, monthIndex)),
  );
}

function calculatePeriodExample(cinema: Cinema) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  if (cinema.payrollPeriodModel === "BIWEEKLY") {
    if (!cinema.payrollPeriodAnchorDate) {
      return {
        text: "Vælg en anchor-dato for at se et eksempel.",
        days: null as number | null,
        warning: "14-dages løn kræver en anchor-dato.",
      };
    }

    const anchor = new Date(`${cinema.payrollPeriodAnchorDate}T00:00:00`);

    if (Number.isNaN(anchor.getTime())) {
      return {
        text: "Anchor-datoen er ugyldig.",
        days: null as number | null,
        warning: "Vælg en gyldig anchor-dato.",
      };
    }

    const start = new Date(anchor);

    while (start <= today) {
      start.setDate(start.getDate() + 14);
    }

    start.setDate(start.getDate() - 14);

    const end = new Date(start);
    end.setDate(end.getDate() + 13);

    return {
      text: `${formatDateDk(start)} → ${formatDateDk(end)}`,
      days: 14,
      warning: null as string | null,
    };
  }

  if (cinema.payrollPeriodModel === "FIXED_DAY_TO_DAY") {
    const startDay = clampDay(cinema.payrollPeriodStartDay);
    const endDay = clampDay(cinema.payrollPeriodEndDay);

    let start = dateWithSafeDay(year, month, startDay);
    let end = dateWithSafeDay(year, month, endDay);

    if (startDay > endDay) {
      if (today.getDate() >= startDay) {
        end = dateWithSafeDay(year, month + 1, endDay);
      } else {
        start = dateWithSafeDay(year, month - 1, startDay);
      }
    }

    if (startDay < endDay && today.getDate() > endDay) {
      start = dateWithSafeDay(year, month + 1, startDay);
      end = dateWithSafeDay(year, month + 1, endDay);
    }

    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

    let warning: string | null = null;

    if (startDay === endDay) {
      warning = "Startdag og slutdag må ikke være den samme.";
    } else if (days < 14) {
      warning =
        "Kort lønperiode. Kontrollér at fra- og til-dato er valgt korrekt.";
    } else if (days > 35) {
      warning =
        "Lang lønperiode. Kontrollér at fra- og til-dato er valgt korrekt.";
    } else if (startDay === 21 && endDay === 19) {
      warning =
        "Kontrollér perioden. Mange virksomheder med start den 21. bruger slutdag den 20.";
    }

    return {
      text: `${formatDateDk(start)} → ${formatDateDk(end)}`,
      days,
      warning,
    };
  }

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  return {
    text: `${formatDateDk(start)} → ${formatDateDk(end)}`,
    days: end.getDate(),
    warning: null as string | null,
  };
}

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
        ...CINEMA_DEFAULTS,
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
          aiEnabled: updatedCinema.aiEnabled,

          payrollRulesEnabled: updatedCinema.payrollRulesEnabled,
          payrollOvertimeEnabled: updatedCinema.payrollOvertimeEnabled,
          plannedOvertimeEnabled: updatedCinema.plannedOvertimeEnabled,
          dailyOvertimeEnabled: updatedCinema.dailyOvertimeEnabled,
          weeklyOvertimeEnabled: updatedCinema.weeklyOvertimeEnabled,
          dailyOvertimeThreshold: updatedCinema.dailyOvertimeThreshold,
          weeklyOvertimeThreshold: updatedCinema.weeklyOvertimeThreshold,

          payrollPeriodModel: updatedCinema.payrollPeriodModel,
          payrollPeriodStartDay: updatedCinema.payrollPeriodStartDay,
          payrollPeriodEndDay: updatedCinema.payrollPeriodEndDay,
          payrollPeriodAnchorDate: updatedCinema.payrollPeriodAnchorDate,
          payrollPayoutRule: updatedCinema.payrollPayoutRule,
          payrollPayoutDay: updatedCinema.payrollPayoutDay,
        }),
      });

      if (!response.ok) {
        throw new Error();
      }

      const savedCinema = await response.json();

      setCinema({
        ...CINEMA_DEFAULTS,
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

  const periodExample = calculatePeriodExample(cinema);

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
            <h2 className="mb-6 text-2xl font-bold">AI-funktioner</h2>

            <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <div>
                <div className="font-semibold">Aktivér AI</div>

                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Aktiverer AI-dashboard, AI-analyser og fremtidige
                  AI-funktioner for denne biograf.
                </div>
              </div>

              <button
                onClick={() =>
                  updateCinemaSettings({
                    ...cinema,
                    aiEnabled: !cinema.aiEnabled,
                  })
                }
                disabled={saving}
                className={`rounded-xl px-4 py-2 font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  cinema.aiEnabled
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-600 hover:bg-gray-700"
                }`}
              >
                {cinema.aiEnabled ? "Aktiveret" : "Deaktiveret"}
              </button>
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

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h3 className="text-lg font-bold">Lønperiode</h3>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Vælg hvordan biografens lønperioder beregnes. Indstillingen
                bruges senere på /my-time og /payroll.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <input
                    type="radio"
                    name="payrollPeriodModel"
                    checked={cinema.payrollPeriodModel === "CALENDAR_MONTH"}
                    onChange={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPeriodModel: "CALENDAR_MONTH",
                        payrollPeriodStartDay: 1,
                        payrollPeriodEndDay: 31,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="font-semibold">Kalendermåned</span>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Perioden følger månedens første og sidste dag.
                  </div>
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <input
                    type="radio"
                    name="payrollPeriodModel"
                    checked={cinema.payrollPeriodModel === "FIXED_DAY_TO_DAY"}
                    onChange={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPeriodModel: "FIXED_DAY_TO_DAY",
                        payrollPeriodStartDay:
                          cinema.payrollPeriodStartDay || 21,
                        payrollPeriodEndDay: cinema.payrollPeriodEndDay || 20,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="font-semibold">Fast lønperiode</span>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Vælg selv hvilken dag perioden starter og slutter.
                  </div>
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <input
                    type="radio"
                    name="payrollPeriodModel"
                    checked={cinema.payrollPeriodModel === "BIWEEKLY"}
                    onChange={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPeriodModel: "BIWEEKLY",
                        payrollPeriodAnchorDate:
                          cinema.payrollPeriodAnchorDate ||
                          toIsoDate(new Date()),
                      })
                    }
                    className="mr-2"
                  />
                  <span className="font-semibold">14-dages løn</span>
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Perioder beregnes i 14-dages intervaller fra en anchor-dato.
                  </div>
                </label>
              </div>

              {cinema.payrollPeriodModel === "FIXED_DAY_TO_DAY" && (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label>
                    <div className="font-semibold">Fra dag</div>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={cinema.payrollPeriodStartDay}
                      onChange={(event) =>
                        setCinema({
                          ...cinema,
                          payrollPeriodStartDay: Number(event.target.value),
                        })
                      }
                      onBlur={() =>
                        updateCinemaSettings({
                          ...cinema,
                          payrollPeriodStartDay: clampDay(
                            cinema.payrollPeriodStartDay,
                          ),
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                    />
                  </label>

                  <label>
                    <div className="font-semibold">Til dag</div>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={cinema.payrollPeriodEndDay}
                      onChange={(event) =>
                        setCinema({
                          ...cinema,
                          payrollPeriodEndDay: Number(event.target.value),
                        })
                      }
                      onBlur={() =>
                        updateCinemaSettings({
                          ...cinema,
                          payrollPeriodEndDay: clampDay(
                            cinema.payrollPeriodEndDay,
                          ),
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                    />
                  </label>
                </div>
              )}

              {cinema.payrollPeriodModel === "BIWEEKLY" && (
                <label className="mt-5 block">
                  <div className="font-semibold">Anchor-dato</div>
                  <input
                    type="date"
                    value={cinema.payrollPeriodAnchorDate || ""}
                    onChange={(event) =>
                      setCinema({
                        ...cinema,
                        payrollPeriodAnchorDate: event.target.value || null,
                      })
                    }
                    onBlur={() => updateCinemaSettings(cinema)}
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950 md:w-auto"
                  />
                </label>
              )}

              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                <div className="font-semibold">Periodeeksempel</div>
                <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                  {periodExample.text}
                  {periodExample.days !== null &&
                    ` (${periodExample.days} dage)`}
                </div>

                {periodExample.warning && (
                  <div className="mt-3 rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-200">
                    ⚠ {periodExample.warning}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
              <h3 className="text-lg font-bold">Udbetaling</h3>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Vælg hvordan udbetalingsdatoen beregnes.
              </p>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <input
                    type="radio"
                    name="payrollPayoutRule"
                    checked={
                      cinema.payrollPayoutRule === "LAST_WEEKDAY_OF_MONTH"
                    }
                    onChange={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPayoutRule: "LAST_WEEKDAY_OF_MONTH",
                        payrollPayoutDay: 0,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="font-semibold">
                    Sidste hverdag i måneden
                  </span>
                </label>

                <label className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                  <input
                    type="radio"
                    name="payrollPayoutRule"
                    checked={cinema.payrollPayoutRule === "FIXED_DAY_OF_MONTH"}
                    onChange={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPayoutRule: "FIXED_DAY_OF_MONTH",
                        payrollPayoutDay: cinema.payrollPayoutDay || 31,
                      })
                    }
                    className="mr-2"
                  />
                  <span className="font-semibold">Fast dato i måneden</span>
                </label>
              </div>

              {cinema.payrollPayoutRule === "FIXED_DAY_OF_MONTH" && (
                <label className="mt-5 block md:w-64">
                  <div className="font-semibold">Udbetalingsdag</div>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={cinema.payrollPayoutDay || 31}
                    onChange={(event) =>
                      setCinema({
                        ...cinema,
                        payrollPayoutDay: Number(event.target.value),
                      })
                    }
                    onBlur={() =>
                      updateCinemaSettings({
                        ...cinema,
                        payrollPayoutDay: clampDay(cinema.payrollPayoutDay),
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  />
                </label>
              )}
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
