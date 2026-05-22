"use client";

import { useEffect, useMemo, useState } from "react";
import PermissionGuard from "@/app/components/PermissionGuard";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type PayrollEntry = {
  id?: number;
  date: string;
  clockIn: string;
  clockOut: string;
  hours: number;
  workType: string;
  status?: string;
  note?: string | null;
  adminNote?: string | null;
};

type PayrollEmployee = {
  userId: number;
  name: string;
  email: string;
  totalHours: number;
  entries: PayrollEntry[];
};

type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function PayrollPage() {
  const [startDate, setStartDate] = useState(firstDayOfMonthIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [userId, setUserId] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [report, setReport] = useState<PayrollEmployee[]>([]);
  const [loading, setLoading] = useState(false);

  const totalHours = useMemo(() => {
    return report.reduce((sum, employee) => sum + employee.totalHours, 0);
  }, [report]);

  function getToken() {
    return localStorage.getItem("token");
  }

  useEffect(() => {
    fetchUsers();
    fetchReport();
  }, []);

  async function fetchUsers() {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setUsers([]);
    }
  }

  async function fetchReport() {
    try {
      setLoading(true);

      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (userId) {
        params.set("userId", userId);
      }

      const response = await fetch(`${API_URL}/payroll?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        setReport([]);
        return;
      }

      const data = await response.json();
      setReport(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setReport([]);
    } finally {
      setLoading(false);
    }
  }

  async function downloadCsv() {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (userId) {
        params.set("userId", userId);
      }

      const response = await fetch(
        `${API_URL}/payroll/export/csv?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        alert("Kunne ikke eksportere CSV");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `loen-${startDate}-til-${endDate}.csv`;
      link.click();

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Fejl ved eksport");
    }
  }

  return (
    <PermissionGuard permission="canManagePayroll">
      <main className="p-6">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Løn / timer</h1>
            <p className="text-gray-600">
              Eksportér registrerede timer til løn.
            </p>
          </div>

          <button
            onClick={downloadCsv}
            className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Eksportér CSV
          </button>
        </div>

        <div className="mb-6 grid gap-4 rounded-xl bg-white p-4 shadow md:grid-cols-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Fra dato</span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border p-3"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Til dato</span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-lg border p-3"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Medarbejder</span>
            <select
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              className="rounded-lg border p-3"
            >
              <option value="">Alle medarbejdere</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </label>

          <button
            onClick={fetchReport}
            disabled={loading}
            className="mt-auto rounded-lg bg-black px-4 py-3 text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Henter..." : "Hent rapport"}
          </button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-white p-4 shadow">
            <div className="text-sm text-gray-500">Medarbejdere</div>
            <div className="text-2xl font-bold">{report.length}</div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <div className="text-sm text-gray-500">Samlede timer</div>
            <div className="text-2xl font-bold">{totalHours.toFixed(2)}</div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <div className="text-sm text-gray-500">Periode</div>
            <div className="text-lg font-semibold">
              {startDate} til {endDate}
            </div>
          </div>
        </div>

        {loading ? (
          <div>Indlæser løndata...</div>
        ) : report.length === 0 ? (
          <div className="rounded-xl bg-white p-6 text-gray-600 shadow">
            Ingen timer fundet i perioden.
          </div>
        ) : (
          <div className="space-y-6">
            {report.map((employee) => (
              <section
                key={employee.userId}
                className="overflow-hidden rounded-xl bg-white shadow"
              >
                <div className="flex flex-col gap-2 border-b bg-gray-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{employee.name}</h2>
                    <p className="text-sm text-gray-600">{employee.email}</p>
                  </div>

                  <div className="rounded-lg bg-black px-4 py-2 text-white">
                    {employee.totalHours.toFixed(2)} timer
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-3">Dato</th>
                        <th className="p-3">Ind</th>
                        <th className="p-3">Ud</th>
                        <th className="p-3">Timer</th>
                        <th className="p-3">Vagttype</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Note</th>
                      </tr>
                    </thead>

                    <tbody>
                      {employee.entries.map((entry, index) => (
                        <tr key={entry.id ?? index} className="border-t">
                          <td className="p-3">{entry.date}</td>
                          <td className="p-3">
                            {formatDateTime(entry.clockIn)}
                          </td>
                          <td className="p-3">
                            {formatDateTime(entry.clockOut)}
                          </td>
                          <td className="p-3 font-medium">
                            {Number(entry.hours).toFixed(2)}
                          </td>
                          <td className="p-3">{entry.workType}</td>
                          <td className="p-3">{entry.status || "-"}</td>
                          <td className="p-3">
                            {entry.adminNote || entry.note || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </PermissionGuard>
  );
}
