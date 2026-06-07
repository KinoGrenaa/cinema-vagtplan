"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type TimeEntryStatus = "PENDING" | "APPROVED" | "REJECTED";

type PayrollPeriodModel = "CALENDAR_MONTH" | "FIXED_DAY_TO_DAY" | "BIWEEKLY";

type PayrollPayoutRule = "LAST_WEEKDAY_OF_MONTH" | "FIXED_DAY_OF_MONTH";

type CinemaPayrollSettings = {
  payrollPeriodModel: PayrollPeriodModel;
  payrollPeriodStartDay: number;
  payrollPeriodEndDay: number;
  payrollPeriodAnchorDate?: string | null;
  payrollPayoutRule?: PayrollPayoutRule;
  payrollPayoutDay?: number;
};

type CurrentUser = {
  id: number;
  role: "MASTER" | "ADMIN" | "EMPLOYEE";
  cinemaId: number;
};

type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
  status: TimeEntryStatus;
  note?: string | null;
  adminNote?: string | null;
  payrollType?: {
    name: string;
  } | null;
  shift?: {
    workType?: {
      name: string;
    } | null;
  } | null;
};

function getStatusLabel(status: TimeEntryStatus) {
  if (status === "APPROVED") return "Godkendt";
  if (status === "REJECTED") return "Afvist";
  return "Afventer";
}

function getStatusClass(status: TimeEntryStatus) {
  if (status === "APPROVED") {
    return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }

  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getHours(entry: TimeEntry) {
  if (!entry.clockOut) return "-";

  const start = new Date(entry.clockIn).getTime();
  const end = new Date(entry.clockOut).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return "-";
  }

  return `${((end - start) / 1000 / 60 / 60).toFixed(2)} t`;
}

function dateToLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function firstDayOfMonthIso(date = new Date()) {
  return dateToLocalDateString(
    new Date(date.getFullYear(), date.getMonth(), 1),
  );
}

function lastDayOfMonthIso(date = new Date()) {
  return dateToLocalDateString(
    new Date(date.getFullYear(), date.getMonth() + 1, 0),
  );
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function clampDay(year: number, month: number, day: number) {
  return Math.min(Math.max(day, 1), getDaysInMonth(year, month));
}

function calculatePayrollPeriod(settings?: CinemaPayrollSettings | null) {
  const today = new Date();

  if (!settings || settings.payrollPeriodModel === "CALENDAR_MONTH") {
    return {
      startDate: firstDayOfMonthIso(),
      endDate: lastDayOfMonthIso(),
    };
  }

  if (settings.payrollPeriodModel === "BIWEEKLY") {
    const anchor = settings.payrollPeriodAnchorDate
      ? new Date(settings.payrollPeriodAnchorDate)
      : new Date(today.getFullYear(), today.getMonth(), 1);

    const msPerDay = 24 * 60 * 60 * 1000;
    const daysSinceAnchor = Math.floor(
      (new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      ).getTime() -
        new Date(
          anchor.getFullYear(),
          anchor.getMonth(),
          anchor.getDate(),
        ).getTime()) /
        msPerDay,
    );

    const cycleOffset = Math.floor(daysSinceAnchor / 14) * 14;
    const start = addDays(anchor, cycleOffset);
    const end = addDays(start, 13);

    return {
      startDate: dateToLocalDateString(start),
      endDate: dateToLocalDateString(end),
    };
  }

  const startDay = settings.payrollPeriodStartDay || 1;
  const endDay = settings.payrollPeriodEndDay || 31;

  if (startDay <= endDay) {
    return {
      startDate: dateToLocalDateString(
        new Date(
          today.getFullYear(),
          today.getMonth(),
          clampDay(today.getFullYear(), today.getMonth(), startDay),
        ),
      ),
      endDate: dateToLocalDateString(
        new Date(
          today.getFullYear(),
          today.getMonth(),
          clampDay(today.getFullYear(), today.getMonth(), endDay),
        ),
      ),
    };
  }

  const startMonthOffset = today.getDate() >= startDay ? 0 : -1;
  const endMonthOffset = today.getDate() >= startDay ? 1 : 0;

  const startMonth = new Date(
    today.getFullYear(),
    today.getMonth() + startMonthOffset,
    1,
  );
  const endMonth = new Date(
    today.getFullYear(),
    today.getMonth() + endMonthOffset,
    1,
  );

  return {
    startDate: dateToLocalDateString(
      new Date(
        startMonth.getFullYear(),
        startMonth.getMonth(),
        clampDay(startMonth.getFullYear(), startMonth.getMonth(), startDay),
      ),
    ),
    endDate: dateToLocalDateString(
      new Date(
        endMonth.getFullYear(),
        endMonth.getMonth(),
        clampDay(endMonth.getFullYear(), endMonth.getMonth(), endDay),
      ),
    ),
  };
}

function isInPayrollPeriod(
  entry: TimeEntry,
  startDate: string,
  endDate: string,
) {
  const entryDate = dateToLocalDateString(new Date(entry.clockIn));
  return entryDate >= startDate && entryDate <= endDate;
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

export default function MyTimePage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [cinemaSettings, setCinemaSettings] =
    useState<CinemaPayrollSettings | null>(null);
  const [payrollPeriod, setPayrollPeriod] = useState(() =>
    calculatePayrollPeriod(null),
  );
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editNote, setEditNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  function getToken() {
    return localStorage.getItem("token");
  }

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/time-entries/me`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        setEntries([]);
        toast.error("Kunne ikke hente dine timer");
        return;
      }

      const data = await response.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setEntries([]);
      toast.error("Kunne ikke hente dine timer");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCinemaPayrollSettings = useCallback(async () => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) return;

    try {
      const user: CurrentUser = JSON.parse(savedUser);

      const response = await fetch(`${API_URL}/cinemas/${user.cinemaId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) return;

      const settings = await response.json();
      const payrollSettings: CinemaPayrollSettings = {
        payrollPeriodModel: settings.payrollPeriodModel || "CALENDAR_MONTH",
        payrollPeriodStartDay: settings.payrollPeriodStartDay || 1,
        payrollPeriodEndDay: settings.payrollPeriodEndDay || 31,
        payrollPeriodAnchorDate: settings.payrollPeriodAnchorDate || null,
        payrollPayoutRule:
          settings.payrollPayoutRule || "LAST_WEEKDAY_OF_MONTH",
        payrollPayoutDay: settings.payrollPayoutDay || 0,
      };

      setCinemaSettings(payrollSettings);
      setPayrollPeriod(calculatePayrollPeriod(payrollSettings));
    } catch (error) {
      console.error(error);
    }
  }, []);

  useRealtimeCore({
    onTimeEntry: fetchEntries,
  });

  function openEdit(entry: TimeEntry) {
    setEditingEntry(entry);
    setEditClockIn(toInputDateTime(entry.clockIn));
    setEditClockOut(toInputDateTime(entry.clockOut));
    setEditNote(entry.note || "");
  }

  function closeEdit() {
    if (savingEdit) return;

    setEditingEntry(null);
    setEditClockIn("");
    setEditClockOut("");
    setEditNote("");
  }

  async function saveEdit() {
    if (!editingEntry) return;

    try {
      setSavingEdit(true);

      const response = await fetch(
        `${API_URL}/time-entries/me/${editingEntry.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            clockIn: new Date(editClockIn).toISOString(),
            clockOut: editClockOut
              ? new Date(editClockOut).toISOString()
              : null,
            note: editNote,
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Kunne ikke rette timeregistrering");
      }

      await fetchEntries();
      closeEdit();
      toast.success("Timeregistrering rettet");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Kunne ikke rette timeregistrering",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  useEffect(() => {
    fetchCinemaPayrollSettings();
    fetchEntries();
  }, [fetchCinemaPayrollSettings, fetchEntries]);

  useEffect(() => {
    setPayrollPeriod(calculatePayrollPeriod(cinemaSettings));
  }, [cinemaSettings]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) =>
      isInPayrollPeriod(entry, payrollPeriod.startDate, payrollPeriod.endDate),
    );
  }, [entries, payrollPeriod.endDate, payrollPeriod.startDate]);

  const totalHours = useMemo(() => {
    return filteredEntries.reduce((total, entry) => {
      if (!entry.clockOut) return total;

      const start = new Date(entry.clockIn).getTime();
      const end = new Date(entry.clockOut).getTime();

      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return total;
      }

      return total + (end - start) / 1000 / 60 / 60;
    }, 0);
  }, [filteredEntries]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mine timer</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Se dine indberettede og godkendte timer.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-1 text-sm font-medium">Lønperiode</div>
          <div className="text-base font-semibold">
            {formatDate(payrollPeriod.startDate)} →{" "}
            {formatDate(payrollPeriod.endDate)}
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Beregnet ud fra biografens lønopsætning.
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Timer i lønperiode
          </div>
          <div className="mt-1 text-2xl font-bold">
            {totalHours.toFixed(2)} t
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Registreringer
          </div>
          <div className="mt-1 text-2xl font-bold">
            {filteredEntries.length}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Afventer
          </div>
          <div className="mt-1 text-2xl font-bold">
            {
              filteredEntries.filter((entry) => entry.status === "PENDING")
                .length
            }
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Henter timer...
        </div>
      )}

      {!loading && filteredEntries.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Der er ingen timer i den aktuelle lønperiode.
        </div>
      )}

      {!loading && filteredEntries.length > 0 && (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-lg font-bold">
                    {entry.shift?.workType?.name ||
                      entry.payrollType?.name ||
                      "Timeregistrering"}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatDateTime(entry.clockIn)}
                  </p>
                </div>

                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                    entry.status,
                  )}`}
                >
                  {getStatusLabel(entry.status)}
                </span>
              </div>

              <div className="grid gap-2 text-sm md:grid-cols-2">
                <div>
                  <span className="font-semibold">Clock ind:</span>{" "}
                  {formatDateTime(entry.clockIn)}
                </div>

                <div>
                  <span className="font-semibold">Clock ud:</span>{" "}
                  {formatDateTime(entry.clockOut)}
                </div>

                <div>
                  <span className="font-semibold">Timer:</span>{" "}
                  {getHours(entry)}
                </div>

                <div>
                  <span className="font-semibold">Status:</span>{" "}
                  {getStatusLabel(entry.status)}
                </div>
              </div>

              {(entry.note || entry.adminNote) && (
                <div className="mt-4 space-y-3">
                  {entry.note && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
                      <span className="font-semibold">Din note:</span>{" "}
                      {entry.note}
                    </div>
                  )}

                  {entry.adminNote && (
                    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950/40">
                      <span className="font-semibold">Admin note:</span>{" "}
                      {entry.adminNote}
                    </div>
                  )}

                  {entry.status !== "APPROVED" && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => openEdit(entry)}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                      >
                        Redigér
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Redigér timeregistrering</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Du kan kun rette timer, der ikke er godkendt endnu.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Clock ind
                </label>
                <input
                  type="datetime-local"
                  value={editClockIn}
                  onChange={(event) => setEditClockIn(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Clock ud
                </label>
                <input
                  type="datetime-local"
                  value={editClockOut}
                  onChange={(event) => setEditClockOut(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Note</label>
                <textarea
                  value={editNote}
                  onChange={(event) => setEditNote(event.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeEdit}
                disabled={savingEdit}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Annuller
              </button>

              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEdit ? "Gemmer..." : "Gem ændringer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
