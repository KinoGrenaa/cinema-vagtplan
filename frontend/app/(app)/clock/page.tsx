"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CurrentUser, Shift, TimeEntry } from "../../../../shared/types";
import { getTodayLocalDate, formatTimeDK } from "@/app/utils/dateTime";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

export default function ClockPage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  const [entries, setEntries] = useState<TimeEntry[]>([]);

  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);

  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);

  const [clockIn, setClockIn] = useState("");

  const [clockOut, setClockOut] = useState("");

  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);

  function getToken() {
    return localStorage.getItem("token");
  }

  function toInputDateTime(value: string) {
    const date = new Date(value);

    const offset = date.getTimezoneOffset();

    return new Date(date.getTime() - offset * 60 * 1000)
      .toISOString()
      .slice(0, 16);
  }

  const fetchEntries = useCallback(async (userId: number) => {
    try {
      const response = await fetch(`${API_URL}/time-entries?userId=${userId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        setEntries([]);
        return;
      }

      const data = await response.json();

      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    }
  }, []);

  const fetchTodayShifts = useCallback(async (userId: number) => {
    try {
      const today = getTodayLocalDate();

      const response = await fetch(`${API_URL}/shifts?date=${today}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        setTodayShifts([]);
        return;
      }

      const data = await response.json();

      const myShifts = Array.isArray(data)
        ? data.filter((shift) => shift.user?.id === userId)
        : [];

      setTodayShifts(myShifts);
    } catch {
      setTodayShifts([]);
    }
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/";
      return;
    }

    const parsedUser: CurrentUser = JSON.parse(savedUser);

    setCurrentUser(parsedUser);

    fetchEntries(parsedUser.id);

    fetchTodayShifts(parsedUser.id);
  }, [fetchEntries, fetchTodayShifts]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) return;

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/time-entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          userId: currentUser.id,
          shiftId: selectedShiftId,
          clockIn: new Date(clockIn).toISOString(),
          clockOut: clockOut ? new Date(clockOut).toISOString() : null,
          note,
        }),
      });

      if (!response.ok) {
        alert("Kunne ikke registrere tid.");
        return;
      }

      setSelectedShiftId(null);

      setClockIn("");

      setClockOut("");

      setNote("");

      await fetchEntries(currentUser.id);

      alert("Tid registreret.");
    } finally {
      setLoading(false);
    }
  }

  const totalHours = useMemo(() => {
    return entries.reduce((total, entry) => {
      if (!entry.clockOut) return total;

      const start = new Date(entry.clockIn);

      const end = new Date(entry.clockOut);

      return total + (end.getTime() - start.getTime()) / 1000 / 60 / 60;
    }, 0);
  }, [entries]);

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Clock ind / ud</h1>

          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Registrer arbejdstid og se tidligere registreringer.
          </p>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-5 text-2xl font-bold">Ny registrering</h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <label className={labelClass}>Vagt</label>

              <select
                className={inputClass}
                value={selectedShiftId ?? ""}
                onChange={(e) =>
                  setSelectedShiftId(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Ingen tilknyttet vagt</option>

                {todayShifts.map((shift) => (
                  <option key={shift.id} value={shift.id}>
                    {formatTimeDK(shift.startTime)}
                    {" - "}
                    {formatTimeDK(shift.endTime)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Clock ind</label>

              <input
                type="datetime-local"
                className={inputClass}
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
              />
            </div>

            <div>
              <label className={labelClass}>Clock ud</label>

              <input
                type="datetime-local"
                className={inputClass}
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className={labelClass}>Note</label>

              <textarea
                className="min-h-28 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Valgfri note..."
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-black py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                {loading ? "Gemmer..." : "Gem registrering"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-6 dark:border-gray-800 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Mine registreringer</h2>

              <p className="mt-1 text-gray-500 dark:text-gray-400">
                Oversigt over tidligere clock ind/ud.
              </p>
            </div>

            <div className="rounded-2xl bg-black px-5 py-3 text-white dark:bg-white dark:text-black">
              <div className="text-sm opacity-80">Samlede timer</div>

              <div className="text-2xl font-bold">{totalHours.toFixed(2)}</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-950">
                <tr className="text-left text-sm text-gray-600 dark:text-gray-400">
                  <th className="px-4 py-3">Clock ind</th>

                  <th className="px-4 py-3">Clock ud</th>

                  <th className="px-4 py-3">Timer</th>

                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {entries.map((entry) => {
                  const hours = entry.clockOut
                    ? (
                        (new Date(entry.clockOut).getTime() -
                          new Date(entry.clockIn).getTime()) /
                        1000 /
                        60 /
                        60
                      ).toFixed(2)
                    : "-";

                  return (
                    <tr
                      key={entry.id}
                      className="border-t border-gray-200 dark:border-gray-800"
                    >
                      <td className="px-4 py-4">
                        {toInputDateTime(entry.clockIn).replace("T", " ")}
                      </td>

                      <td className="px-4 py-4">
                        {entry.clockOut
                          ? toInputDateTime(entry.clockOut).replace("T", " ")
                          : "-"}
                      </td>

                      <td className="px-4 py-4 font-semibold">{hours}</td>

                      <td className="px-4 py-4">
                        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200">
                          {entry.status || "PENDING"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {entries.length === 0 && (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                Ingen registreringer endnu.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
