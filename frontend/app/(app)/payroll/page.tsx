"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import InputModal from "@/app/components/modals/InputModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { toast } from "sonner";
import ExportModal from "@/app/components/modals/ExportModal";
import { formatDateDK } from "@/app/utils/dateTime";
import type {
  CinemaPayrollSettings,
  PayrollAuditHistory,
  PayrollEmployee,
  PayrollPeriod,
  User,
} from "./types";
import {
  calculatePayrollPeriod,
  describePayrollModel,
  formatDateTime,
  formatHours,
  firstDayOfMonthIso,
  lastDayOfMonthIso,
} from "./utils";
import PayrollWarnings from "./components/PayrollWarnings";
import PayrollEmployeeSummaryTable from "./components/PayrollEmployeeSummaryTable";
import PayrollAttentionTable from "./components/PayrollAttentionTable";
import PayrollPeriodStatus from "./components/PayrollPeriodStatus";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function PayrollPage() {
  const router = useRouter();
  const inputDialog = useInputModal();
  const confirmDialog = useConfirm();
  const [startDate, setStartDate] = useState(firstDayOfMonthIso());
  const [endDate, setEndDate] = useState(lastDayOfMonthIso());
  const [userId, setUserId] = useState("");
  const [cinemaSettings, setCinemaSettings] =
    useState<CinemaPayrollSettings | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [report, setReport] = useState<PayrollEmployee[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [auditHistory, setAuditHistory] = useState<PayrollAuditHistory[]>([]);

  const [loading, setLoading] = useState(false);
  const [locking, setLocking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

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

  function getCurrentCinemaId() {
    if (typeof window === "undefined") return null;

    const savedUser = localStorage.getItem("user");

    if (!savedUser) return null;

    try {
      const user = JSON.parse(savedUser) as { cinemaId?: number };
      return user.cinemaId || null;
    } catch {
      return null;
    }
  }

  function applyCurrentPayrollPeriod(settings = cinemaSettings) {
    const periodDates = calculatePayrollPeriod(settings);

    setStartDate(periodDates.startDate);
    setEndDate(periodDates.endDate);
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

  async function fetchCinemaPayrollSettings() {
    const cinemaId = getCurrentCinemaId();

    if (!cinemaId) return;

    try {
      const response = await fetch(`${API_URL}/cinemas/${cinemaId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) return;

      const data: CinemaPayrollSettings = await response.json();
      setCinemaSettings(data);
      applyCurrentPayrollPeriod(data);
    } catch (error) {
      console.error(error);
    }
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
        setPendingCount(0);
        setRejectedCount(0);
        return;
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setReport(data);
        setPendingCount(0);
        setRejectedCount(0);
      } else {
        setReport(Array.isArray(data.employees) ? data.employees : []);
        setPendingCount(Number(data.pendingCount || 0));
        setRejectedCount(Number(data.rejectedCount || 0));
      }
    } catch (error) {
      console.error(error);
      setReport([]);
      setPendingCount(0);
      setRejectedCount(0);
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
        const errorData = await response.json().catch(() => null);

        const message =
          errorData?.message || "Eksporten kunne ikke gennemføres.";

        toast.error(message);
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
      toast.error("Eksport fejlede");
    } finally {
      setExporting(false);
    }
  }

  function lockPeriod() {
    confirmDialog.confirm({
      title: "Lås lønperiode",
      description: `Er du sikker på, at du vil låse lønperioden ${startDate} til ${endDate}?`,
      confirmText: "Lås periode",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
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
            toast.error(errorText || "Låsning fejlede");
            return;
          }

          await refreshPayroll();
        } catch (error) {
          console.error(error);
          toast.error("Låsning fejlede");
        } finally {
          setLocking(false);
        }
      },
    });
  }

  function unlockPeriod() {
    if (!period?.id) return;

    inputDialog.prompt({
      title: "Oplås lønperiode",
      description: `Angiv årsagen til at lønperioden ${startDate} til ${endDate} skal oplåses.`,
      label: "Begrundelse",
      placeholder: "Skriv begrundelse...",
      confirmText: "Oplås periode",
      cancelText: "Annuller",
      required: true,
      onConfirm: async (value) => {
        const note = value.trim();

        if (!note) {
          toast.error(
            "Du skal skrive en begrundelse for at oplåse lønperioden.",
          );
          throw new Error("Unlock note is required");
        }

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
            toast.error(errorText || "Oplåsning fejlede");
            return;
          }

          await refreshPayroll();
        } catch (error) {
          console.error(error);
          toast.error("Oplåsning fejlede");
        } finally {
          setUnlocking(false);
        }
      },
    });
  }

  useEffect(() => {
    fetchUsers();
    fetchCinemaPayrollSettings();
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
          <div className="mb-4 flex flex-col justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-100 md:flex-row md:items-center">
            <div>
              <p className="font-semibold">Aktuel lønperiode</p>
              <p>
                {describePayrollModel(cinemaSettings)} ·{" "}
                {formatDateDK(startDate)} til {formatDateDK(endDate)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => applyCurrentPayrollPeriod()}
              className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              Brug aktuel lønperiode
            </button>
          </div>

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
          <PayrollEmployeeSummaryTable report={report} />
        </div>

        <PayrollAttentionTable overtimeWarnings={overtimeWarnings} />

        <PayrollPeriodStatus
          period={period}
          totalHours={totalHours}
          pendingCount={pendingCount}
          rejectedCount={rejectedCount}
          locking={locking}
          unlocking={unlocking}
          onLockPeriod={lockPeriod}
          onUnlockPeriod={unlockPeriod}
          onOpenTimeApproval={() => router.push("/time-approval")}
        />

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
                type="button"
                onClick={() => setExportModalOpen(true)}
                disabled={exporting}
                className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
              >
                Eksporter
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
                            Afvigelse
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
                              {entry.deviation?.hasDeviation ? (
                                <div className="space-y-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                                  {entry.deviation.messages.length > 0 ? (
                                    entry.deviation.messages.map(
                                      (message, messageIndex) => (
                                        <div
                                          key={`${entry.id || index}-deviation-${messageIndex}`}
                                        >
                                          ⚠ {message}
                                        </div>
                                      ),
                                    )
                                  ) : (
                                    <div>⚠ Afvigelse</div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                  OK
                                </span>
                              )}
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
          <h2 className="mb-4 text-xl font-bold">Lønhistorik</h2>

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

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />
      <InputModal
        open={inputDialog.open}
        loading={inputDialog.loading}
        value={inputDialog.value}
        title={inputDialog.title}
        description={inputDialog.description}
        label={inputDialog.label}
        placeholder={inputDialog.placeholder}
        confirmText={inputDialog.confirmText}
        cancelText={inputDialog.cancelText}
        required={inputDialog.required}
        onChange={inputDialog.setValue}
        onConfirm={inputDialog.handleConfirm}
        onCancel={inputDialog.handleCancel}
      />
      <ExportModal
        open={exportModalOpen}
        exporting={exporting}
        onClose={() => setExportModalOpen(false)}
        onExport={(format) => {
          downloadExport(format);
          setExportModalOpen(false);
        }}
      />
    </PermissionGuard>
  );
}
