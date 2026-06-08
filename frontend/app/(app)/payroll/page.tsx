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
import {
  dateToLocalDateString,
  formatDateDK,
  formatTimeDK,
} from "@/app/utils/dateTime";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import InputModal from "@/app/components/modals/InputModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

type PayrollEntryDeviation = {
  hasDeviation: boolean;
  requiresNote: boolean;
  types: string[];
  plannedMinutes?: number;
  registeredMinutes?: number;
  differenceMinutes?: number;
  clockInDeviationMinutes?: number;
  clockOutDeviationMinutes?: number;
  messages: string[];
};

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
  deviation?: PayrollEntryDeviation;
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

type PayrollPeriodModel = "CALENDAR_MONTH" | "FIXED_DAY_TO_DAY" | "BIWEEKLY";

type PayrollPayoutRule = "LAST_WEEKDAY_OF_MONTH" | "FIXED_DAY_OF_MONTH";

type CinemaPayrollSettings = {
  id: number;
  name: string;
  payrollPeriodModel?: PayrollPeriodModel;
  payrollPeriodStartDay?: number;
  payrollPeriodEndDay?: number;
  payrollPeriodAnchorDate?: string | null;
  payrollPayoutRule?: PayrollPayoutRule;
  payrollPayoutDay?: number;
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

function firstDayOfMonthIso() {
  const now = new Date();

  return dateToLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
}

function lastDayOfMonthIso() {
  const now = new Date();

  return dateToLocalDateString(
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
  );
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clampDay(year: number, monthIndex: number, day: number) {
  return Math.min(Math.max(day, 1), daysInMonth(year, monthIndex));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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

function describePayrollModel(settings?: CinemaPayrollSettings | null) {
  if (!settings || settings.payrollPeriodModel === "CALENDAR_MONTH") {
    return "Kalendermåned";
  }

  if (settings.payrollPeriodModel === "BIWEEKLY") {
    return "14 dage";
  }

  return `${settings.payrollPeriodStartDay || 1}.–${settings.payrollPeriodEndDay || 31}.`;
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
        const errorText = await response.text();
        toast.error(errorText || "Eksport fejlede");
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Lønperiode status
              </div>

              <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {period?.status === "LOCKED"
                  ? "Låst"
                  : period?.status === "EXPORTED"
                    ? "Eksporteret"
                    : "Åben"}
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

            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Godkendte timer
                </div>
                <div className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                  {totalHours.toFixed(2).replace(".", ",")}
                </div>
              </div>

              <div className="rounded-lg border border-amber-200 px-4 py-3 dark:border-amber-800">
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  Afventer godkendelse
                </div>
                <div className="mt-1 text-lg font-bold text-amber-800 dark:text-amber-200">
                  {pendingCount}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Afviste
                </div>
                <div className="mt-1 text-lg font-bold text-gray-700 dark:text-gray-300">
                  {rejectedCount}
                </div>
              </div>
            </div>

            {pendingCount > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                <div className="font-semibold">
                  ⚠ {pendingCount} afventende tidsregistreringer
                </div>

                <div className="mt-1">
                  Disse timer er ikke medtaget i løngrundlaget før de er
                  godkendt.
                </div>

                <button
                  onClick={() => router.push("/time-approval")}
                  className="mt-3 rounded-lg border border-amber-400 px-3 py-2 font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40"
                >
                  Gå til Time Approval
                </button>
              </div>
            )}

            {rejectedCount > 0 && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
                <div className="font-semibold">
                  🚫 Afviste tidsregistreringer: {rejectedCount}
                </div>

                <div className="mt-1">
                  Afviste registreringer indgår ikke i løngrundlaget.
                </div>
              </div>
            )}

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
    </PermissionGuard>
  );
}
