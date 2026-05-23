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
  payrollCode?: string;
  exportCode?: string;
  payrollName?: string;
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
  employeeNumber?: string | null;
  payrollEmployeeId?: string | null;
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

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatHours(value: number) {
  return value.toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PayrollPage() {
  const [startDate, setStartDate] = useState(firstDayOfMonthIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [userId, setUserId] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [report, setReport] = useState<PayrollEmployee[]>([]);
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [auditHistory, setAuditHistory] = useState<PayrollAuditHistory[]>([]);

  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [exporting, setExporting] = useState(false);

  const totalHours = useMemo(() => {
    return report.reduce((sum, employee) => sum + employee.totalHours, 0);
  }, [report]);

  function getToken() {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  }

  function buildParams(includeUser = true) {
    const params = new URLSearchParams({
      startDate,
      endDate,
    });

    if (includeUser && userId) {
      params.set("userId", userId);
    }

    return params;
  }

  async function fetchUsers() {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        setUsers([]);
        return;
      }

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

      const response = await fetch(
        `${API_URL}/payroll?${buildParams().toString()}`,
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
      const response = await fetch(
        `${API_URL}/payroll/period?${buildParams(false).toString()}`,
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
      const response = await fetch(
        `${API_URL}/payroll/audit-history?${buildParams(false).toString()}`,
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

  async function downloadExport(type: "csv" | "xlsx" | "pdf" | "uniconta") {
    try {
      setExporting(true);

      const endpoint =
        type === "uniconta"
          ? `${API_URL}/payroll/export/uniconta`
          : `${API_URL}/payroll/export/${type}`;

      const response = await fetch(`${endpoint}?${buildParams().toString()}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(errorText || "Eksport fejlede");
        return;
      }

      const blob = await response.blob();

      const extension =
        type === "xlsx" ? "xlsx" : type === "pdf" ? "pdf" : "csv";

      const filename =
        type === "uniconta"
          ? `uniconta-payroll-${startDate}-${endDate}.csv`
          : `payroll-${startDate}-${endDate}.${extension}`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      await refreshPayroll();
    } catch (error) {
      console.error(error);
      alert("Eksport fejlede");
    } finally {
      setExporting(false);
    }
  }

  async function lockPeriod() {
    const confirmed = window.confirm(
      `Er du sikker på, at du vil låse lønperioden ${startDate} til ${endDate}?`,
    );

    if (!confirmed) return;

    try {
      setLocking(true);

      const response = await fetch(`${API_URL}/payroll/lock`, {
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
        const errorText = await response.text();
        alert(errorText || "Låsning fejlede");
        return;
      }

      await refreshPayroll();
    } catch (error) {
      console.error(error);
      alert("Låsning fejlede");
    } finally {
      setLocking(false);
    }
  }

  async function unlockPeriod() {
    if (!period?.id) return;

    const note = window.prompt("Skriv årsag til oplåsning:");

    if (note === null) return;

    try {
      setUnlocking(true);

      const response = await fetch(`${API_URL}/payroll/unlock/${period.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          note,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        alert(errorText || "Oplåsning fejlede");
        return;
      }

      await refreshPayroll();
    } catch (error) {
      console.error(error);
      alert("Oplåsning fejlede");
    } finally {
      setUnlocking(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    refreshPayroll();
  }, [startDate, endDate, userId]);

  return (
    <PermissionGuard roles={["MASTER", "ADMIN"]}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold">Løn / Payroll</h1>
          <p className="text-sm text-gray-600">
            Se timer, lås lønperioder og eksportér til lønbehandling.
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Startdato
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded border p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">Slutdato</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded border p-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Medarbejder
              </label>
              <select
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                className="w-full rounded border p-2"
              >
                <option value="">Alle medarbejdere</option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={refreshPayroll}
                disabled={loading}
                className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Henter..." : "Opdater"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-gray-600">Lønperiode status</div>
              <div className="text-xl font-bold">
                {period?.status || "OPEN"}
              </div>
              {period?.lockedAt && (
                <div className="text-xs text-gray-500">
                  Låst: {formatDateTime(period.lockedAt)}
                </div>
              )}
              {period?.exportedAt && (
                <div className="text-xs text-gray-500">
                  Eksporteret: {formatDateTime(period.exportedAt)}
                </div>
              )}
              {period?.unlockedAt && (
                <div className="text-xs text-gray-500">
                  Låst op: {formatDateTime(period.unlockedAt)}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={lockPeriod}
                disabled={locking || period?.status === "LOCKED"}
                className="rounded bg-yellow-600 px-4 py-2 text-white hover:bg-yellow-700 disabled:opacity-50"
              >
                {locking ? "Låser..." : "Lås periode"}
              </button>

              {period && (
                <button
                  onClick={unlockPeriod}
                  disabled={unlocking}
                  className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {unlocking ? "Låser op..." : "Lås periode op"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Rapport</h2>
              <p className="text-sm text-gray-600">
                Timer i alt: {formatHours(totalHours)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => downloadExport("csv")}
                disabled={exporting}
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                Eksporter CSV
              </button>

              <button
                onClick={() => downloadExport("xlsx")}
                disabled={exporting}
                className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Eksporter XLSX
              </button>

              <button
                onClick={() => downloadExport("pdf")}
                disabled={exporting}
                className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800 disabled:opacity-50"
              >
                Eksporter PDF
              </button>

              <button
                onClick={() => downloadExport("uniconta")}
                disabled={exporting}
                className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                Eksporter Uniconta CSV
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-gray-500">Indlæser...</div>
          ) : report.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              Ingen tidsregistreringer i perioden.
            </div>
          ) : (
            <div className="space-y-6">
              {report.map((employee) => (
                <div key={employee.userId} className="rounded-lg border">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50 p-3">
                    <div>
                      <div className="font-bold">{employee.name}</div>
                      <div className="text-sm text-gray-600">
                        {employee.email}
                      </div>
                      {(employee.employeeNumber ||
                        employee.payrollEmployeeId) && (
                        <div className="text-xs text-gray-500">
                          {employee.employeeNumber &&
                            `Medarbejdernummer: ${employee.employeeNumber}`}
                          {employee.employeeNumber &&
                            employee.payrollEmployeeId &&
                            " · "}
                          {employee.payrollEmployeeId &&
                            `Løn ID: ${employee.payrollEmployeeId}`}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-600">Timer</div>
                      <div className="text-lg font-bold">
                        {formatHours(employee.totalHours)}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left">
                          <th className="p-2">Dato</th>
                          <th className="p-2">Ind</th>
                          <th className="p-2">Ud</th>
                          <th className="p-2 text-right">Timer</th>
                          <th className="p-2">Arbejdstype</th>
                          <th className="p-2">Lønart</th>
                          <th className="p-2">Eksportkode</th>
                          <th className="p-2">Løntype</th>
                          <th className="p-2">Status</th>
                          <th className="p-2">Låst</th>
                        </tr>
                      </thead>

                      <tbody>
                        {employee.entries.map((entry, index) => (
                          <tr
                            key={entry.id || `${employee.userId}-${index}`}
                            className="border-b"
                          >
                            <td className="p-2">{entry.date}</td>
                            <td className="p-2">
                              {formatDateTime(entry.clockIn)}
                            </td>
                            <td className="p-2">
                              {formatDateTime(entry.clockOut)}
                            </td>
                            <td className="p-2 text-right">
                              {formatHours(entry.hours)}
                            </td>
                            <td className="p-2">{entry.workType}</td>
                            <td className="p-2">{entry.payrollCode || "-"}</td>
                            <td className="p-2">{entry.exportCode || "-"}</td>
                            <td className="p-2">{entry.payrollName || "-"}</td>
                            <td className="p-2">{entry.status || "-"}</td>
                            <td className="p-2">
                              {entry.payrollLocked ? "Ja" : "Nej"}
                              {entry.payrollUnlockedByMaster ? " / oplåst" : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white p-4 shadow">
          <h2 className="mb-4 text-xl font-bold">Payroll audit history</h2>

          {auditHistory.length === 0 ? (
            <div className="text-sm text-gray-500">
              Ingen historik for perioden.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="p-2">Status</th>
                    <th className="p-2">Start</th>
                    <th className="p-2">Slut</th>
                    <th className="p-2">Låst</th>
                    <th className="p-2">Eksporteret</th>
                    <th className="p-2">Oplåst</th>
                    <th className="p-2">Note</th>
                  </tr>
                </thead>

                <tbody>
                  {auditHistory.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2 font-medium">{item.status}</td>
                      <td className="p-2">
                        {new Date(item.startDate).toLocaleDateString("da-DK")}
                      </td>
                      <td className="p-2">
                        {new Date(item.endDate).toLocaleDateString("da-DK")}
                      </td>
                      <td className="p-2">{formatDateTime(item.lockedAt)}</td>
                      <td className="p-2">{formatDateTime(item.exportedAt)}</td>
                      <td className="p-2">{formatDateTime(item.unlockedAt)}</td>
                      <td className="p-2">{item.unlockNote || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PermissionGuard>
  );
}
