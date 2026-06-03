"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PermissionGuard from "@/app/components/PermissionGuard";
import {
  getTodayLocalDate,
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";

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
  return getTodayLocalDate();
}

function firstDayOfMonthIso() {
  const now = new Date();

  return dateToLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return `${formatDateDK(value)} ${formatTimeDK(value)}`;
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

  const overtimeHours = useMemo(() => {
    return report.reduce((sum, employee) => {
      return (
        sum +
        employee.entries.reduce((entrySum, entry) => {
          const code = entry.payrollCode || "";

          if (code.includes("OVERTIME")) {
            return entrySum + entry.hours;
          }

          return entrySum;
        }, 0)
      );
    }, 0);
  }, [report]);

  const weekendHours = useMemo(() => {
    return report.reduce((sum, employee) => {
      return (
        sum +
        employee.entries.reduce((entrySum, entry) => {
          const code = entry.payrollCode || "";

          if (code.includes("WEEKEND")) {
            return entrySum + entry.hours;
          }

          return entrySum;
        }, 0)
      );
    }, 0);
  }, [report]);

  const eveningHours = useMemo(() => {
    return report.reduce((sum, employee) => {
      return (
        sum +
        employee.entries.reduce((entrySum, entry) => {
          const code = entry.payrollCode || "";

          if (code.includes("EVENING")) {
            return entrySum + entry.hours;
          }

          return entrySum;
        }, 0)
      );
    }, 0);
  }, [report]);

  const nightHours = useMemo(() => {
    return report.reduce((sum, employee) => {
      return (
        sum +
        employee.entries.reduce((entrySum, entry) => {
          const code = entry.payrollCode || "";

          if (code.includes("NIGHT")) {
            return entrySum + entry.hours;
          }

          return entrySum;
        }, 0)
      );
    }, 0);
  }, [report]);

  const payrollDistributionData = useMemo(() => {
    const totals: Record<string, number> = {};

    report.forEach((employee) => {
      employee.entries.forEach((entry) => {
        const key = entry.payrollCode || "STANDARD";
        totals[key] = (totals[key] || 0) + entry.hours;
      });
    });

    return Object.entries(totals).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }));
  }, [report]);

  const employeeLoadData = useMemo(() => {
    return report
      .map((employee) => ({
        name: employee.name,
        hours: Number(employee.totalHours.toFixed(2)),
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [report]);

  const dailyHoursData = useMemo(() => {
    const totals: Record<string, number> = {};

    report.forEach((employee) => {
      employee.entries.forEach((entry) => {
        totals[entry.date] = (totals[entry.date] || 0) + entry.hours;
      });
    });

    return Object.entries(totals)
      .map(([date, hours]) => ({
        date,
        hours: Number(hours.toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [report]);

  const overtimeWarnings = useMemo(() => {
    return report
      .map((employee) => {
        const overtime = employee.entries.reduce((sum, entry) => {
          const code = entry.payrollCode || "";

          if (code.includes("OVERTIME")) {
            return sum + entry.hours;
          }

          return sum;
        }, 0);

        const weekend = employee.entries.reduce((sum, entry) => {
          const code = entry.payrollCode || "";

          if (code.includes("WEEKEND")) {
            return sum + entry.hours;
          }

          return sum;
        }, 0);

        const night = employee.entries.reduce((sum, entry) => {
          const code = entry.payrollCode || "";

          if (code.includes("NIGHT")) {
            return sum + entry.hours;
          }

          return sum;
        }, 0);

        return {
          name: employee.name,
          totalHours: employee.totalHours,
          overtime,
          weekend,
          night,
        };
      })
      .filter(
        (employee) =>
          employee.overtime > 0 || employee.weekend > 10 || employee.night > 5,
      )
      .sort((a, b) => b.overtime - a.overtime);
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

      const text = await response.text();

      if (!text) {
        setPeriod(null);
        return;
      }

      const data = JSON.parse(text);
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
    <PermissionGuard permission="canManagePayroll">
      <div className="space-y-6 p-6 text-gray-900 dark:text-gray-100">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Løn / Payroll
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Se timer, lås lønperioder og eksportér til lønbehandling.
          </p>
        </div>

        <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Startdato
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Slutdato
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Medarbejder
              </label>
              <select
                value={userId}
                onChange={(event) => setUserId(event.target.value)}
                className="w-full rounded border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
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

        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Totale timer
            </div>
            <div className="mt-2 text-3xl font-bold">
              {formatHours(totalHours)}
            </div>
          </div>

          <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-900 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Overtid
            </div>
            <div className="mt-2 text-3xl font-bold text-red-600">
              {formatHours(overtimeHours)}
            </div>
          </div>

          <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm dark:border-purple-900 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Weekend
            </div>
            <div className="mt-2 text-3xl font-bold text-purple-600">
              {formatHours(weekendHours)}
            </div>
          </div>

          <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm dark:border-orange-900 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Aften
            </div>
            <div className="mt-2 text-3xl font-bold text-orange-600">
              {formatHours(eveningHours)}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-sm dark:border-blue-900 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">Nat</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {formatHours(nightHours)}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Medarbejder summeringer
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Payroll oversigt pr medarbejder.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                  <th className="pb-3 pr-4">Medarbejder</th>
                  <th className="pb-3 pr-4">Timer</th>
                  <th className="pb-3 pr-4">Overtid</th>
                  <th className="pb-3 pr-4">Weekend</th>
                  <th className="pb-3 pr-4">Aften</th>
                  <th className="pb-3 pr-4">Nat</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {report.map((employee) => {
                  const total = employee.entries.reduce(
                    (sum, entry) => sum + entry.hours,
                    0,
                  );

                  const overtime = employee.entries.reduce((sum, entry) => {
                    const code = entry.payrollCode || "";
                    return code.includes("OVERTIME") ? sum + entry.hours : sum;
                  }, 0);

                  const weekend = employee.entries.reduce((sum, entry) => {
                    const code = entry.payrollCode || "";
                    return code.includes("WEEKEND") ? sum + entry.hours : sum;
                  }, 0);

                  const evening = employee.entries.reduce((sum, entry) => {
                    const code = entry.payrollCode || "";
                    return code.includes("EVENING") ? sum + entry.hours : sum;
                  }, 0);

                  const night = employee.entries.reduce((sum, entry) => {
                    const code = entry.payrollCode || "";
                    return code.includes("NIGHT") ? sum + entry.hours : sum;
                  }, 0);

                  return (
                    <tr key={employee.userId}>
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                        {employee.name}
                      </td>
                      <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                        {formatHours(total)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-red-600">
                        {formatHours(overtime)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-purple-600">
                        {formatHours(weekend)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-orange-600">
                        {formatHours(evening)}
                      </td>
                      <td className="py-3 pr-4 font-medium text-blue-600">
                        {formatHours(night)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm dark:border-red-900 dark:bg-gray-900">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-red-600">
                Overtime warnings
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Medarbejdere med høj belastning eller overtid.
              </p>
            </div>
          </div>

          {overtimeWarnings.length === 0 ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
              Ingen overtime warnings i perioden.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                    <th className="pb-3 pr-4">Medarbejder</th>
                    <th className="pb-3 pr-4">Totale timer</th>
                    <th className="pb-3 pr-4">Overtid</th>
                    <th className="pb-3 pr-4">Weekend</th>
                    <th className="pb-3 pr-4">Nat</th>
                    <th className="pb-3 pr-4">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {overtimeWarnings.map((employee) => (
                    <tr key={employee.name}>
                      <td className="py-3 pr-4 font-medium text-gray-900 dark:text-gray-100">
                        {employee.name}
                      </td>

                      <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                        {formatHours(employee.totalHours)}
                      </td>

                      <td className="py-3 pr-4 font-bold text-red-600">
                        {formatHours(employee.overtime)}
                      </td>

                      <td className="py-3 pr-4 font-bold text-purple-600">
                        {formatHours(employee.weekend)}
                      </td>

                      <td className="py-3 pr-4 font-bold text-blue-600">
                        {formatHours(employee.night)}
                      </td>

                      <td className="py-3 pr-4 text-gray-900 dark:text-gray-100">
                        {employee.overtime > 0 ? (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                            OVERTIME
                          </span>
                        ) : employee.weekend > 10 ? (
                          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            WEEKEND LOAD
                          </span>
                        ) : (
                          <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            NIGHT LOAD
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Timer pr dag
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Arbejdstimer i den valgte lønperiode.
              </p>
            </div>

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyHoursData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="hours"
                    stroke="#2563eb"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Payroll fordeling
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Fordeling af lønarter.
              </p>
            </div>

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={payrollDistributionData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={110}
                    label
                  >
                    {payrollDistributionData.map((entry, index) => {
                      const colors = [
                        "#2563eb",
                        "#dc2626",
                        "#7c3aed",
                        "#ea580c",
                        "#0891b2",
                        "#16a34a",
                      ];

                      return (
                        <Cell
                          key={entry.name}
                          fill={colors[index % colors.length]}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 xl:col-span-2">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Mest belastede medarbejdere
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Top medarbejdere baseret på timer.
              </p>
            </div>

            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeLoadData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="hours" fill="#16a34a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Lønperiode status
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {period?.status || "OPEN"}
              </div>
              {period?.lockedAt && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Låst: {formatDateTime(period.lockedAt)}
                </div>
              )}
              {period?.exportedAt && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Eksporteret: {formatDateTime(period.exportedAt)}
                </div>
              )}
              {period?.unlockedAt && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
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

        <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Rapport
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
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
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              Indlæser...
            </div>
          ) : report.length === 0 ? (
            <div className="py-8 text-center text-gray-500 dark:text-gray-400">
              Ingen tidsregistreringer i perioden.
            </div>
          ) : (
            <div className="space-y-6">
              {report.map((employee) => (
                <div
                  key={employee.userId}
                  className="rounded-lg border border-gray-200 dark:border-gray-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800">
                    <div>
                      <div className="font-bold text-gray-900 dark:text-gray-100">
                        {employee.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {employee.email}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Timer
                      </div>
                      <div className="text-lg font-bold">
                        {formatHours(employee.totalHours)}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-sm text-gray-900 dark:text-gray-100">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          <th className="p-2 text-gray-700 dark:text-gray-200">
                            Dato
                          </th>
                          <th className="p-2 text-gray-700 dark:text-gray-200">
                            Ind
                          </th>
                          <th className="p-2 text-gray-700 dark:text-gray-200">
                            Ud
                          </th>
                          <th className="p-2 text-right">Timer</th>
                          <th className="p-2 text-gray-700 dark:text-gray-200">
                            Arbejdstype
                          </th>
                          <th className="p-2 text-gray-700 dark:text-gray-200">
                            Lønart
                          </th>
                          <th className="p-2 text-gray-700 dark:text-gray-200">
                            Eksportkode
                          </th>
                          <th className="p-2 text-gray-700 dark:text-gray-200">
                            Løntype
                          </th>
                          <th className="p-2 text-gray-700 dark:text-gray-200">
                            Status
                          </th>
                          <th className="p-2 text-gray-700 dark:text-gray-200">
                            Låst
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {employee.entries.map((entry, index) => (
                          <tr
                            key={entry.id || `${employee.userId}-${index}`}
                            className="border-b border-gray-200 dark:border-gray-800"
                          >
                            <td className="p-2 text-gray-900 dark:text-gray-100">
                              {entry.date}
                            </td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">
                              {formatDateTime(entry.clockIn)}
                            </td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">
                              {formatDateTime(entry.clockOut)}
                            </td>
                            <td className="p-2 text-right">
                              {formatHours(entry.hours)}
                            </td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">
                              {entry.workType}
                            </td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">
                              {entry.payrollCode || "-"}
                            </td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">
                              {entry.exportCode || "-"}
                            </td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">
                              {entry.payrollName || "-"}
                            </td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">
                              {entry.status || "-"}
                            </td>
                            <td className="p-2 text-gray-900 dark:text-gray-100">
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

        <div className="rounded-xl bg-white p-4 shadow dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800">
          <h2 className="mb-4 text-xl font-bold">Payroll audit history</h2>

          {auditHistory.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Ingen historik for perioden.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm text-gray-900 dark:text-gray-100">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                    <th className="p-2 text-gray-700 dark:text-gray-200">
                      Status
                    </th>
                    <th className="p-2 text-gray-700 dark:text-gray-200">
                      Start
                    </th>
                    <th className="p-2 text-gray-700 dark:text-gray-200">
                      Slut
                    </th>
                    <th className="p-2 text-gray-700 dark:text-gray-200">
                      Låst
                    </th>
                    <th className="p-2 text-gray-700 dark:text-gray-200">
                      Eksporteret
                    </th>
                    <th className="p-2 text-gray-700 dark:text-gray-200">
                      Oplåst
                    </th>
                    <th className="p-2 text-gray-700 dark:text-gray-200">
                      Note
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {auditHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-200 dark:border-gray-800"
                    >
                      <td className="p-2 font-medium text-gray-900 dark:text-gray-100">
                        {item.status}
                      </td>
                      <td className="p-2 text-gray-900 dark:text-gray-100">
                        {new Date(item.startDate).toLocaleDateString("da-DK")}
                      </td>
                      <td className="p-2 text-gray-900 dark:text-gray-100">
                        {new Date(item.endDate).toLocaleDateString("da-DK")}
                      </td>
                      <td className="p-2 text-gray-900 dark:text-gray-100">
                        {formatDateTime(item.lockedAt)}
                      </td>
                      <td className="p-2 text-gray-900 dark:text-gray-100">
                        {formatDateTime(item.exportedAt)}
                      </td>
                      <td className="p-2 text-gray-900 dark:text-gray-100">
                        {formatDateTime(item.unlockedAt)}
                      </td>
                      <td className="p-2 text-gray-900 dark:text-gray-100">
                        {item.unlockNote || "-"}
                      </td>
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
