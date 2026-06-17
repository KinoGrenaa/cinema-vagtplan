"use client";

import { useState } from "react";
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
import ExportModal from "@/app/components/modals/ExportModal";
import InfoModal from "@/app/components/modals/InfoModal";
import InputModal from "@/app/components/modals/InputModal";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";

import { formatDateDK } from "@/app/utils/dateTime";

import {
  lockPayrollPeriod,
  unlockPayrollPeriod,
} from "./services/payrollService";

import { describePayrollModel, formatDateTime, formatHours } from "./utils";

import PayrollEmployeeSummaryTable from "./components/PayrollEmployeeSummaryTable";
import PayrollAttentionTable from "./components/PayrollAttentionTable";
import PayrollPeriodStatus from "./components/PayrollPeriodStatus";

import { usePayrollFilters } from "./hooks/usePayrollFilters";
import { usePayrollData } from "./hooks/usePayrollData";
import { usePayrollStats } from "./hooks/usePayrollStats";
import { usePayrollExport } from "./hooks/usePayrollExport";

export default function PayrollPage() {
  const router = useRouter();
  const inputDialog = useInputModal();
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();

  const {
    startDate,
    endDate,
    userId,
    setStartDate,
    setEndDate,
    setUserId,
    applyCurrentPayrollPeriod,
    previousPayrollPeriod,
    nextPayrollPeriod,
  } = usePayrollFilters();

  const {
    cinemaSettings,
    users,
    report,
    pendingCount,
    voidedCount,
    period,
    auditHistory,
    loading,
    refreshPayroll,
  } = usePayrollData({
    startDate,
    endDate,
    userId,
    onSettingsLoaded: applyCurrentPayrollPeriod,
    onError: (title, description) => {
      infoDialog.showError(title, description);
    },
  });

  useRealtimeCore({
    onTimeEntry: () => {
      refreshPayroll();
    },
  });

  const {
    totalHours,
    overtimeHours,
    weekendHours,
    eveningHours,
    nightHours,
    payrollDistributionData,
    employeeLoadData,
    dailyHoursData,
    overtimeWarnings,
  } = usePayrollStats(report);

  const adjustmentCount = report.reduce(
    (sum, employee) => sum + (employee.adjustmentCount ?? 0),
    0,
  );

  const payrollAdjustmentEmployees = report
    .map((employee) => ({
      ...employee,
      payrollAdjustments: employee.payrollAdjustments ?? [],
    }))
    .filter((employee) => employee.payrollAdjustments.length > 0);

  const formatSignedHoursAsTime = (hoursValue: number) => {
    const sign = hoursValue >= 0 ? "+" : "-";
    const absoluteMinutes = Math.round(Math.abs(hoursValue) * 60);
    const hours = Math.floor(absoluteMinutes / 60);
    const minutes = absoluteMinutes % 60;

    return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}`;
  };

  const formatHoursAsTime = (hoursValue: number) => {
    const absoluteMinutes = Math.round(Math.abs(hoursValue) * 60);
    const hours = Math.floor(absoluteMinutes / 60);
    const minutes = absoluteMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}`;
  };

  const formatAdjustmentReason = (reason: string) => {
    switch (reason) {
      case "EDIT_AFTER_EXPORT":
        return "Rettet efter eksport";
      case "APPROVAL_AFTER_EXPORT":
        return "Godkendt efter eksport";
      case "MANUAL_ENTRY_IN_EXPORTED_PERIOD":
        return "Manuel registrering i eksporteret periode";
      default:
        return "Efterregulering";
    }
  };

  const { exporting, downloadExport } = usePayrollExport({
    startDate,
    endDate,
    userId,
    refreshPayroll,
  });

  const [locking, setLocking] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAdvancedAnalysis, setShowAdvancedAnalysis] = useState(false);
  const [expandedEmployeeIds, setExpandedEmployeeIds] = useState<number[]>([]);

  const toggleEmployeeGroup = (employeeId: number) => {
    setExpandedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  };

  function lockPeriod() {
    confirmDialog.confirm({
      title: "Lås lønperiode",
      description: `Er du sikker på, at du vil låse lønperioden ${startDate} til ${endDate}?`,
      confirmText: "Lås lønperiode",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        try {
          setLocking(true);

          await lockPayrollPeriod({
            startDate,
            endDate,
          });

          await refreshPayroll();
        } catch (error) {
          infoDialog.showError(
            "Lønperioden kunne ikke låses",
            error instanceof Error && error.message
              ? error.message
              : "Låsning fejlede. Prøv igen.",
          );
        } finally {
          setLocking(false);
        }
      },
    });
  }

  function unlockPeriod() {
    if (!period?.id) return;

    inputDialog.prompt({
      title: "Genåbn lønperiode",
      description: `Skriv en intern note om hvorfor lønperioden ${startDate} til ${endDate} skal genåbnes.`,
      label: "Intern note",
      placeholder: "Skriv intern note...",
      confirmText: "Genåbn lønperiode",
      cancelText: "Annuller",
      required: true,
      onConfirm: async (value) => {
        const note = value.trim();

        if (!note) {
          return;
        }

        try {
          setUnlocking(true);

          await unlockPayrollPeriod(period.id, note);

          await refreshPayroll();
        } catch (error) {
          infoDialog.showError(
            "Lønperioden kunne ikke genåbnes",
            error instanceof Error && error.message
              ? error.message
              : "Genåbning fejlede. Prøv igen.",
          );
        } finally {
          setUnlocking(false);
        }
      },
    });
  }

  return (
    <PermissionGuard permission="canManagePayroll">
      <div className="mx-auto max-w-7xl space-y-6 p-6 text-gray-900 dark:text-gray-100">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Løn
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Gennemgå timer, håndter afvigelser og klargør lønperioden til
                eksport.
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                  {describePayrollModel(cinemaSettings)}
                </span>

                {pendingCount > 0 && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    {pendingCount} afventer godkendelse
                  </span>
                )}

                {adjustmentCount > 0 && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                    {adjustmentCount} efterregulering
                    {adjustmentCount === 1 ? "" : "er"}
                  </span>
                )}
              </div>
            </div>

            <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40 xl:w-auto xl:min-w-[420px]">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Valgt lønperiode
              </div>

              <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatDateDK(startDate)} → {formatDateDK(endDate)}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => previousPayrollPeriod(cinemaSettings)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                >
                  Forrige
                </button>

                <button
                  type="button"
                  onClick={() => applyCurrentPayrollPeriod(cinemaSettings)}
                  className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Aktuel
                </button>

                <button
                  type="button"
                  onClick={() => nextPayrollPeriod(cinemaSettings)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                >
                  Næste
                </button>

                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((value) => !value)}
                  className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                >
                  {showAdvancedFilters ? "Skjul filter" : "Filter"}
                </button>
              </div>
            </div>
          </div>

          {showAdvancedFilters && (
            <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="mb-3">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Avanceret filter
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Brug kun dette, hvis du skal se en anden periode eller én
                  medarbejder.
                </p>
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
                    className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
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
                    className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-200">
                    Medarbejder
                  </label>
                  <select
                    value={userId}
                    onChange={(event) => setUserId(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white p-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
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
                    type="button"
                    onClick={refreshPayroll}
                    disabled={loading}
                    className="w-full rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? "Henter..." : "Opdater"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        <PayrollPeriodStatus
          period={period}
          totalHours={totalHours}
          pendingCount={pendingCount}
          voidedCount={voidedCount}
          adjustmentCount={adjustmentCount}
          locking={locking}
          unlocking={unlocking}
          exporting={exporting}
          onLockPeriod={lockPeriod}
          onUnlockPeriod={unlockPeriod}
          onOpenExportModal={() => setExportModalOpen(true)}
          onOpenTimeApproval={() => router.push("/time-approval")}
        />

        <section className="grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Godkendte timer
            </div>
            <div className="mt-2 text-2xl font-bold">
              {formatHours(totalHours)}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Tæller med i løngrundlaget.
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Afventer
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-700 dark:text-amber-300">
              {pendingCount}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Skal håndteres før eksport.
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Afviste/annullerede
            </div>
            <div className="mt-2 text-2xl font-bold">{voidedCount}</div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Indgår ikke i løn.
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Efterreguleringer
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-700 dark:text-blue-300">
              {adjustmentCount}
            </div>
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Medtages separat i lønkørslen.
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Tillæg og belastning
            </div>
            <div className="mt-2 grid gap-1 text-sm">
              <div className="flex justify-between gap-3">
                <span>Overtid</span>
                <span className="font-semibold">
                  {formatHours(overtimeHours)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Weekend</span>
                <span className="font-semibold">
                  {formatHours(weekendHours)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Aften</span>
                <span className="font-semibold">
                  {formatHours(eveningHours)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Nat</span>
                <span className="font-semibold">{formatHours(nightHours)}</span>
              </div>
            </div>
          </div>
        </section>

        {overtimeWarnings.length > 0 && (
          <PayrollAttentionTable overtimeWarnings={overtimeWarnings} />
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Medarbejdere
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Overblik over løngrundlag, afvigelser og efterreguleringer pr.
                medarbejder.
              </p>
            </div>

            <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
              {report.length} medarbejder{report.length === 1 ? "" : "e"}
            </div>
          </div>

          <PayrollEmployeeSummaryTable report={report} />

          <div className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Detaljer pr. medarbejder
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Fold en medarbejder ud for at se de enkelte tidsregistreringer.
              </p>
            </div>

            {loading ? (
              <div className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-500 dark:bg-gray-950/40 dark:text-gray-400">
                Indlæser...
              </div>
            ) : report.length === 0 ? (
              <div className="rounded-xl bg-gray-50 py-8 text-center text-sm text-gray-500 dark:bg-gray-950/40 dark:text-gray-400">
                Ingen tidsregistreringer i perioden.
              </div>
            ) : (
              <div className="space-y-3">
                {report.map((employee) => {
                  const isExpanded = expandedEmployeeIds.includes(
                    employee.userId,
                  );

                  return (
                    <div
                      key={employee.userId}
                      className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800"
                    >
                      <button
                        type="button"
                        onClick={() => toggleEmployeeGroup(employee.userId)}
                        className="flex w-full flex-wrap items-center justify-between gap-3 bg-gray-50 p-4 text-left transition hover:bg-gray-100 dark:bg-gray-950/40 dark:hover:bg-gray-800"
                      >
                        <div>
                          <div className="font-bold text-gray-900 dark:text-gray-100">
                            {employee.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {employee.email}
                          </div>
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {employee.entries.length} registrering
                            {employee.entries.length === 1 ? "" : "er"}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Timer
                            </div>
                            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                              {formatHours(employee.totalHours)}
                            </div>
                          </div>

                          <div className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200">
                            {isExpanded ? "Skjul" : "Vis"}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="overflow-x-auto border-t border-gray-200 dark:border-gray-800">
                          <table className="w-full min-w-[900px] text-sm text-gray-900 dark:text-gray-100">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                                <th className="p-2">Dato</th>
                                <th className="p-2">Mødetid</th>
                                <th className="p-2">Fyraften</th>
                                <th className="p-2 text-right">Timer</th>
                                <th className="p-2">Arbejdstype</th>
                                <th className="p-2">Lønart</th>
                                <th className="p-2">Løntype</th>
                                <th className="p-2">Afvigelse</th>
                                <th className="p-2">Låst</th>
                              </tr>
                            </thead>

                            <tbody>
                              {employee.entries.map((entry, index) => (
                                <tr
                                  key={
                                    entry.id || `${employee.userId}-${index}`
                                  }
                                  className="border-b border-gray-200 last:border-0 dark:border-gray-800"
                                >
                                  <td className="p-2">{entry.date}</td>
                                  <td className="p-2">
                                    {formatDateTime(entry.clockIn)}
                                  </td>
                                  <td className="p-2">
                                    {formatDateTime(entry.clockOut)}
                                  </td>
                                  <td className="p-2 text-right font-medium">
                                    {formatHours(entry.hours)}
                                  </td>
                                  <td className="p-2">{entry.workType}</td>
                                  <td className="p-2">
                                    {entry.payrollCode || "-"}
                                  </td>
                                  <td className="p-2">
                                    {entry.payrollName || "-"}
                                  </td>
                                  <td className="p-2">
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
                                  <td className="p-2">
                                    {entry.payrollLocked ? "Ja" : "Nej"}
                                    {entry.payrollUnlockedByMaster
                                      ? " / genåbnet"
                                      : ""}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {payrollAdjustmentEmployees.length > 0 && (
          <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm dark:border-blue-900/60 dark:bg-gray-900">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Efterreguleringer i denne lønperiode
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Rettelser fra tidligere eller lukkede perioder, som medtages i
                den valgte lønkørsel.
              </p>
            </div>

            <div className="space-y-4">
              {payrollAdjustmentEmployees.map((employee) => (
                <div
                  key={employee.userId}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40"
                >
                  <div className="mb-3">
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                      {employee.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {employee.email}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {employee.payrollAdjustments.map((adjustment) => (
                      <div
                        key={adjustment.id}
                        className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              Efterregulering{" "}
                              {formatSignedHoursAsTime(adjustment.hours)}
                            </div>

                            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                              {formatAdjustmentReason(adjustment.reason)}
                            </div>

                            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              Fra {formatHoursAsTime(adjustment.exportedHours)}{" "}
                              til {formatHoursAsTime(adjustment.adjustedHours)}
                            </div>
                          </div>

                          <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                            Oprettet: {formatDateTime(adjustment.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Avanceret analyse
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Grafer og lønhistorik er skjult som standard for at holde
                lønkørslen overskuelig.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAdvancedAnalysis((value) => !value)}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
            >
              {showAdvancedAnalysis ? "Skjul analyse" : "Vis analyse"}
            </button>
          </div>

          {showAdvancedAnalysis && (
            <div className="mt-6 space-y-6">
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      Timer pr. dag
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Arbejdstimer i den valgte lønperiode.
                    </p>
                  </div>

                  <div className="h-[280px]">
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

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      Lønfordeling
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Fordeling af lønarter.
                    </p>
                  </div>

                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={payrollDistributionData}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={95}
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

                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40 xl:col-span-2">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      Mest belastede medarbejdere
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Top medarbejdere baseret på timer.
                    </p>
                  </div>

                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={employeeLoadData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar
                          dataKey="hours"
                          fill="#16a34a"
                          radius={[8, 8, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40">
                <h3 className="mb-4 text-lg font-bold">Lønhistorik</h3>

                {auditHistory.length === 0 ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Ingen historik for perioden.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-sm text-gray-900 dark:text-gray-100">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200">
                          <th className="p-2">Status</th>
                          <th className="p-2">Start</th>
                          <th className="p-2">Slut</th>
                          <th className="p-2">Låst</th>
                          <th className="p-2">Eksporteret</th>
                          <th className="p-2">Genåbnet</th>
                          <th className="p-2">Note</th>
                        </tr>
                      </thead>

                      <tbody>
                        {auditHistory.map((item) => (
                          <tr
                            key={item.id}
                            className="border-b border-gray-200 dark:border-gray-800"
                          >
                            <td className="p-2 font-medium">{item.status}</td>
                            <td className="p-2">
                              {new Date(item.startDate).toLocaleDateString(
                                "da-DK",
                              )}
                            </td>
                            <td className="p-2">
                              {new Date(item.endDate).toLocaleDateString(
                                "da-DK",
                              )}
                            </td>
                            <td className="p-2">
                              {formatDateTime(item.lockedAt)}
                            </td>
                            <td className="p-2">
                              {formatDateTime(item.exportedAt)}
                            </td>
                            <td className="p-2">
                              {formatDateTime(item.unlockedAt)}
                            </td>
                            <td className="p-2">{item.unlockNote || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
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

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />

      <ExportModal
        open={exportModalOpen}
        exporting={exporting}
        onClose={() => setExportModalOpen(false)}
        onExport={async (format) => {
          try {
            await downloadExport(format);
            setExportModalOpen(false);
          } catch (error) {
            setExportModalOpen(false);

            setTimeout(() => {
              infoDialog.showError(
                "Kan ikke eksportere lønperiode",
                error instanceof Error && error.message
                  ? error.message
                  : "Eksporten kunne ikke gennemføres.",
              );
            }, 0);
          }
        }}
      />
    </PermissionGuard>
  );
}
