"use client";

import { useState } from "react";

import AdminGuard from "@/app/components/AdminGuard";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type PayrollEntry = {
  date: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  workType: string;
};

type PayrollUser = {
  userId: number;
  name: string;
  email: string;
  totalHours: number;
  entries: PayrollEntry[];
};

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-white dark:focus:ring-white/10";

const labelClass =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

export default function PayrollPage() {
  const [startDate, setStartDate] = useState("2026-05-01");

  const [endDate, setEndDate] = useState("2026-05-31");

  const [report, setReport] = useState<PayrollUser[]>([]);

  const [loading, setLoading] = useState(false);

  function getToken() {
    return localStorage.getItem("token");
  }

  async function fetchReport() {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/payroll?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        setReport([]);
        return;
      }

      const data: PayrollUser[] = await response.json();

      setReport(Array.isArray(data) ? data : []);
    } catch {
      setReport([]);
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const rows = [
      [
        "Medarbejder",
        "Email",
        "Dato",
        "Clock ind",
        "Clock ud",
        "Timer",
        "Arbejdstype",
      ],
    ];

    report.forEach((user) => {
      user.entries.forEach((entry) => {
        rows.push([
          user.name,
          user.email,
          entry.date,
          new Date(entry.clockIn).toLocaleString("da-DK"),
          new Date(entry.clockOut).toLocaleString("da-DK"),
          entry.hours.toFixed(2),
          entry.workType,
        ]);
      });
    });

    const csvContent = rows
      .map((row) => row.map((cell) => `"${cell}"`).join(";"))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `loenrapport-${startDate}-til-${endDate}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <h1 className="text-3xl font-bold">Løn-export</h1>

            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Hent medarbejdernes registrerede timer og eksporter til CSV.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className={labelClass}>Startdato</label>

                <input
                  type="date"
                  className={inputClass}
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div>
                <label className={labelClass}>Slutdato</label>

                <input
                  type="date"
                  className={inputClass}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchReport}
                  className="w-full rounded-xl bg-black py-3 font-medium text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                >
                  {loading ? "Henter..." : "Hent rapport"}
                </button>
              </div>

              <div className="flex items-end">
                <button
                  onClick={exportCsv}
                  disabled={report.length === 0}
                  className="w-full rounded-xl bg-green-600 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Eksporter CSV
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {report.map((user) => (
              <div
                key={user.userId}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="border-b border-gray-200 p-6 dark:border-gray-800">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{user.name}</h2>

                      <p className="text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-black px-5 py-3 text-center text-white dark:bg-white dark:text-black">
                      <div className="text-sm opacity-80">
                        Registrerede timer
                      </div>

                      <div className="text-2xl font-bold">
                        {user.totalHours.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-50 dark:bg-gray-950">
                      <tr className="text-left text-sm text-gray-600 dark:text-gray-400">
                        <th className="px-4 py-3">Dato</th>
                        <th className="px-4 py-3">Clock ind</th>
                        <th className="px-4 py-3">Clock ud</th>
                        <th className="px-4 py-3">Timer</th>
                        <th className="px-4 py-3">Arbejdstype</th>
                      </tr>
                    </thead>

                    <tbody>
                      {user.entries.map((entry, index) => (
                        <tr
                          key={index}
                          className="border-t border-gray-200 text-sm dark:border-gray-800"
                        >
                          <td className="px-4 py-3">
                            {new Date(entry.date).toLocaleDateString("da-DK")}
                          </td>

                          <td className="px-4 py-3">
                            {new Date(entry.clockIn).toLocaleString("da-DK")}
                          </td>

                          <td className="px-4 py-3">
                            {new Date(entry.clockOut).toLocaleString("da-DK")}
                          </td>

                          <td className="px-4 py-3 font-semibold">
                            {entry.hours.toFixed(2)}
                          </td>

                          <td className="px-4 py-3">
                            {entry.workType}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {user.entries.length === 0 && (
                  <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                    Ingen registreringer fundet i perioden.
                  </div>
                )}
              </div>
            ))}

            {!loading && report.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-2 text-4xl">📊</div>

                <h2 className="text-xl font-bold">
                  Ingen løndata endnu
                </h2>

                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Vælg en periode og hent rapporten.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}