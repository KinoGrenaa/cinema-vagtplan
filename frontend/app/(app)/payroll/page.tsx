"use client";

import { useState } from "react";

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

export default function PayrollPage() {
  const [startDate, setStartDate] = useState("2026-05-01");
  const [endDate, setEndDate] = useState("2026-05-31");
  const [report, setReport] = useState<PayrollUser[]>([]);
  const [loading, setLoading] = useState(false);

  function getToken() {
    return localStorage.getItem("token");
  }

  async function fetchReport() {
    setLoading(true);

    const response = await fetch(
      `http://localhost:3001/payroll?startDate=${startDate}&endDate=${endDate}`,
      {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      },
    );

    const data: PayrollUser[] = await response.json();
    setReport(data);
    setLoading(false);
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
    <>
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h1 className="text-3xl font-bold">Løn-export</h1>
        <p className="text-gray-500">
          Vælg periode og hent medarbejdernes registrerede timer.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block mb-1 font-medium">Startdato</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 font-medium">Slutdato</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchReport}
              className="w-full bg-black text-white py-3 rounded-lg"
            >
              {loading ? "Henter..." : "Hent rapport"}
            </button>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportCsv}
              disabled={report.length === 0}
              className="w-full bg-green-600 text-white py-3 rounded-lg disabled:bg-gray-400"
            >
              Eksporter CSV
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Rapport</h2>

        <div className="space-y-6">
          {report.map((user) => (
            <div key={user.userId} className="border rounded-xl p-4">
              <div className="flex justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold">{user.name}</h3>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-500">Total</div>
                  <div className="text-2xl font-bold">
                    {user.totalHours.toFixed(2)} timer
                  </div>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-5 bg-gray-50 font-medium text-sm">
                  <div className="p-3 border-r">Dato</div>
                  <div className="p-3 border-r">Clock ind</div>
                  <div className="p-3 border-r">Clock ud</div>
                  <div className="p-3 border-r">Timer</div>
                  <div className="p-3">Arbejdstype</div>
                </div>

                {user.entries.map((entry, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-5 border-t text-sm"
                  >
                    <div className="p-3 border-r">{entry.date}</div>
                    <div className="p-3 border-r">
                      {new Date(entry.clockIn).toLocaleString("da-DK")}
                    </div>
                    <div className="p-3 border-r">
                      {new Date(entry.clockOut).toLocaleString("da-DK")}
                    </div>
                    <div className="p-3 border-r">{entry.hours.toFixed(2)}</div>
                    <div className="p-3">{entry.workType}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {report.length === 0 && (
            <div className="text-gray-500">Ingen rapport hentet endnu.</div>
          )}
        </div>
      </div>
    </>
  );
}
