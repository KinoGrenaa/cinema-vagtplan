"use client";

import { useEffect, useState } from "react";
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
import { useAuth } from "@/app/providers/AuthProvider";

import {
  lockPayrollPeriod,
  unlockPayrollPeriod,
} from "./services/payrollService";

import { formatDateTime } from "./utils";

import PayrollAttentionTable from "./components/PayrollAttentionTable";
import PayrollPeriodStatus from "./components/PayrollPeriodStatus";
import PayrollHeader from "./components/PayrollHeader";
import PayrollSummaryCards from "./components/PayrollSummaryCards";
import PayrollEmployeesSection from "./components/PayrollEmployeesSection";
import PayrollAdjustmentsSection from "./components/PayrollAdjustmentsSection";

import { usePayrollFilters } from "./hooks/usePayrollFilters";
import { usePayrollData } from "./hooks/usePayrollData";
import { usePayrollStats } from "./hooks/usePayrollStats";
import { usePayrollExport } from "./hooks/usePayrollExport";

export default function PayrollPage() {
  const router = useRouter();
  const { user } = useAuth();
  const inputDialog = useInputModal();
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    string | null
  >(null);

  useEffect(() => {
    function updateSelectedMasterCinema() {
      setSelectedMasterCinemaId(
        window.localStorage.getItem("masterSelectedCinemaId"),
      );
    }

    updateSelectedMasterCinema();

    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedMasterCinema,
    );
    window.addEventListener("storage", updateSelectedMasterCinema);

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedMasterCinema,
      );
      window.removeEventListener("storage", updateSelectedMasterCinema);
    };
  }, []);

  const isMasterWithoutActiveCinema =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  const payrollDataEnabled = Boolean(user) && !isMasterWithoutActiveCinema;

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
    enabled: payrollDataEnabled,
    onSettingsLoaded: applyCurrentPayrollPeriod,
    onError: (title, description) => {
      infoDialog.showError(title, description);
    },
  });

  useRealtimeCore({
    onTimeEntry: () => {
      if (payrollDataEnabled) {
        refreshPayroll();
      }
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

  if (isMasterWithoutActiveCinema) {
    return (
      <PermissionGuard permission="canManagePayroll">
        <div className="min-h-screen bg-gray-50 px-4 py-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
          <div className="mx-auto max-w-7xl space-y-6">
            <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm dark:border-amber-800 dark:bg-amber-950/30">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-xl font-bold text-amber-950 dark:text-amber-100">
                    Ingen aktiv biograf valgt
                  </h1>
                  <p className="mt-1 text-sm text-amber-900 dark:text-amber-100/80">
                    Vælg en biograf i MASTER-panelet, før du kan se eller
                    administrere løn.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/master")}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
                >
                  Vælg biograf
                </button>
              </div>
            </section>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard permission="canManagePayroll">
      <div className="relative mx-auto min-h-screen max-w-7xl space-y-6 bg-gray-50 p-6 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div
          aria-hidden="true"
          className="fixed inset-0 -z-10 bg-gray-50 dark:bg-gray-950"
        />
        <PayrollHeader
          adjustmentCount={adjustmentCount}
          cinemaSettings={cinemaSettings}
          endDate={endDate}
          loading={loading}
          pendingCount={pendingCount}
          showAdvancedFilters={showAdvancedFilters}
          startDate={startDate}
          userId={userId}
          users={users}
          onApplyCurrentPayrollPeriod={() =>
            applyCurrentPayrollPeriod(cinemaSettings)
          }
          onNextPayrollPeriod={() => nextPayrollPeriod(cinemaSettings)}
          onPreviousPayrollPeriod={() => previousPayrollPeriod(cinemaSettings)}
          onRefreshPayroll={refreshPayroll}
          onSetEndDate={setEndDate}
          onSetStartDate={setStartDate}
          onSetUserId={setUserId}
          onToggleAdvancedFilters={() =>
            setShowAdvancedFilters((value) => !value)
          }
        />

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

        <PayrollSummaryCards
          adjustmentCount={adjustmentCount}
          eveningHours={eveningHours}
          nightHours={nightHours}
          overtimeHours={overtimeHours}
          pendingCount={pendingCount}
          totalHours={totalHours}
          voidedCount={voidedCount}
          weekendHours={weekendHours}
        />

        {overtimeWarnings.length > 0 && (
          <PayrollAttentionTable overtimeWarnings={overtimeWarnings} />
        )}

        <PayrollEmployeesSection
          expandedEmployeeIds={expandedEmployeeIds}
          loading={loading}
          report={report}
          onToggleEmployeeGroup={toggleEmployeeGroup}
        />

        <PayrollAdjustmentsSection employees={payrollAdjustmentEmployees} />

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
