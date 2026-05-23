"use client";

import { useEffect, useMemo, useState } from "react";
import PermissionGuard from "@/app/components/PermissionGuard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
  payrollLocked?: boolean;
  payrollUnlockedByMaster?: boolean;
  payrollPeriodId?: number | null;
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

type PayrollPeriod = {
  id: number;
  status: "OPEN" | "LOCKED" | "EXPORTED" | "UNLOCKED";
  lockedAt?: string | null;
  exportedAt?: string | null;
  unlockedAt?: string | null;
};

type PayrollAuditHistory = {
  id: number;

  status: "OPEN" | "LOCKED" | "EXPORTED" | "UNLOCKED";

  startDate: string;
  endDate: string;

  lockedAt?: string | null;
  lockedByUserId?: number | null;

  exportedAt?: string | null;
  exportedByUserId?: number | null;

  unlockedAt?: string | null;
  unlockedByUserId?: number | null;

  unlockNote?: string | null;
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
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  const [auditHistory, setAuditHistory] = useState<PayrollAuditHistory[]>([]);

  const totalHours = useMemo(() => {
    return report.reduce((sum, employee) => sum + employee.totalHours, 0);
  }, [report]);

  function getToken() {
    return localStorage.getItem("token");
  }

  useEffect(() => {
    fetchUsers();
    fetchReport();
    fetchPeriod();
    fetchAuditHistory();
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

  async function fetchPeriod() {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const response = await fetch(
        `${API_URL}/payroll/period?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        setPeriod(null);
        return;
      }

      const data = await response.json();
      setPeriod(data || null);
    } catch (error) {
      console.error(error);
      setPeriod(null);
    }
  }

  async function fetchAuditHistory() {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const response = await fetch(
        `${API_URL}/payroll/audit-history?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        setAuditHistory([]);
        return;
      }

      const data = await response.json();

      setAuditHistory(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setAuditHistory([]);
    }
  }

  async function refreshPayroll() {
    await fetchReport();
    await fetchPeriod();
    await fetchAuditHistory();
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
        let message = "Kunne ikke eksportere CSV";

        try {
          const errorData = await response.json();

          if (errorData?.message) {
            message = errorData.message;
          }
        } catch {}

        alert(message);
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `loen-${startDate}-til-${endDate}.csv`;
      link.click();

      window.URL.revokeObjectURL(url);

      await refreshPayroll();
    } catch (error) {
      console.error(error);
      alert("Fejl ved eksport");
    }
  }
  async function downloadXlsx() {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (userId) {
        params.set("userId", userId);
      }

      const response = await fetch(
        `${API_URL}/payroll/export/xlsx?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        let message = "Kunne ikke eksportere XLSX";

        try {
          const errorData = await response.json();

          if (errorData?.message) {
            message = errorData.message;
          }
        } catch {}

        alert(message);
        return;
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `loen-${startDate}-til-${endDate}.xlsx`;

      link.click();

      window.URL.revokeObjectURL(url);

      await refreshPayroll();
    } catch (error) {
      console.error(error);
      alert("Fejl ved XLSX eksport");
    }
  }
  async function downloadPdf() {
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      if (userId) {
        params.set("userId", userId);
      }

      const response = await fetch(
        `${API_URL}/payroll/export/pdf?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        let message = "Kunne ikke eksportere PDF";

        try {
          const errorData = await response.json();

          if (errorData?.message) {
            message = errorData.message;
          }
        } catch {}

        alert(message);
        return;
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = url;

      link.download = `loen-${startDate}-til-${endDate}.pdf`;

      link.click();

      window.URL.revokeObjectURL(url);

      await refreshPayroll();
    } catch (error) {
      console.error(error);
      alert("Fejl ved PDF eksport");
    }
  }

  async function lockPeriod() {
    try {
      setLocking(true);

      const response = await fetch(`${API_URL}/payroll/period/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          startDate,
          endDate,
        }),
      });

      if (!response.ok) {
        alert("Kunne ikke låse lønperiode");
        return;
      }

      await refreshPayroll();
      alert("Lønperiode låst");
    } catch (error) {
      console.error(error);
      alert("Fejl ved låsning");
    } finally {
      setLocking(false);
    }
  }
  async function unlockPeriod() {
    if (!period) return;

    const note = prompt("Skriv note til hvorfor lønperioden låses op:");

    try {
      setUnlocking(true);

      const response = await fetch(
        `${API_URL}/payroll/period/${period.id}/unlock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            note,
          }),
        },
      );

      if (!response.ok) {
        alert("Kunne ikke låse lønperiode op");
        return;
      }

      await refreshPayroll();

      alert("Lønperiode låst op");
    } catch (error) {
      console.error(error);
      alert("Fejl ved unlock");
    } finally {
      setUnlocking(false);
    }
  }
  async function unlockTimeEntry(entryId: number) {
    const note = prompt("Skriv note til hvorfor tidsregistreringen låses op:");

    try {
      const response = await fetch(
        `${API_URL}/payroll/time-entry/${entryId}/unlock`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            note,
          }),
        },
      );

      if (!response.ok) {
        alert("Kunne ikke låse tidsregistrering op");
        return;
      }

      await refreshPayroll();

      alert("Tidsregistrering låst op");
    } catch (error) {
      console.error(error);
      alert("Fejl ved unlock");
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

          <div className="flex flex-wrap gap-3">
            {period && (
              <div
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  period.status === "LOCKED"
                    ? "bg-orange-500"
                    : period.status === "EXPORTED"
                      ? "bg-blue-600"
                      : period.status === "UNLOCKED"
                        ? "bg-yellow-600"
                        : "bg-green-600"
                }`}
              >
                Status: {period.status}
              </div>
            )}

            <button
              onClick={lockPeriod}
              disabled={locking}
              className="rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {locking ? "Låser..." : "Lås lønperiode"}
            </button>

            {period && (
              <button
                onClick={unlockPeriod}
                disabled={unlocking}
                className="rounded-lg bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:opacity-50"
              >
                {unlocking ? "Låser op..." : "MASTER Unlock"}
              </button>
            )}

            <button
              onClick={downloadCsv}
              className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              Eksportér CSV
            </button>
            <button
              onClick={downloadXlsx}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Eksportér XLSX
            </button>

            <button
              onClick={downloadPdf}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Eksportér PDF
            </button>
          </div>
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
            onClick={refreshPayroll}
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
                          <td className="p-3">
                            <div className="flex flex-wrap gap-2">
                              <span>{entry.status || "-"}</span>

                              {entry.payrollLocked && (
                                <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                  LÅST
                                </span>
                              )}

                              {entry.payrollUnlockedByMaster && (
                                <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700">
                                  MASTER UNLOCK
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-2">
                              <span>
                                {entry.adminNote || entry.note || "-"}
                              </span>

                              {entry.payrollLocked && entry.id && (
                                <button
                                  onClick={() => unlockTimeEntry(entry.id!)}
                                  className="w-fit rounded bg-yellow-600 px-2 py-1 text-xs font-semibold text-white hover:bg-yellow-700"
                                >
                                  MASTER Unlock
                                </button>
                              )}
                            </div>
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
        <div className="mt-10 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-2xl font-bold">Payroll historik</h2>

          {auditHistory.length === 0 ? (
            <div className="text-gray-500">Ingen payroll historik fundet.</div>
          ) : (
            <div className="space-y-4">
              {auditHistory.map((item) => (
                <div key={item.id} className="rounded-xl border p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-3">
                    <span
                      className={`rounded px-3 py-1 text-sm font-semibold text-white ${
                        item.status === "LOCKED"
                          ? "bg-orange-500"
                          : item.status === "EXPORTED"
                            ? "bg-blue-600"
                            : item.status === "UNLOCKED"
                              ? "bg-yellow-600"
                              : "bg-green-600"
                      }`}
                    >
                      {item.status}
                    </span>

                    <span className="font-medium">
                      {new Date(item.startDate).toLocaleDateString("da-DK")}
                      {" → "}
                      {new Date(item.endDate).toLocaleDateString("da-DK")}
                    </span>
                  </div>

                  <div className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
                    <div>
                      <strong>Låst:</strong>{" "}
                      {item.lockedAt ? formatDateTime(item.lockedAt) : "-"}
                    </div>

                    <div>
                      <strong>Eksporteret:</strong>{" "}
                      {item.exportedAt ? formatDateTime(item.exportedAt) : "-"}
                    </div>

                    <div>
                      <strong>Låst op:</strong>{" "}
                      {item.unlockedAt ? formatDateTime(item.unlockedAt) : "-"}
                    </div>

                    <div>
                      <strong>Unlock note:</strong> {item.unlockNote || "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </PermissionGuard>
  );
}
