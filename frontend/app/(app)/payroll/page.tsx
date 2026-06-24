"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PermissionGuard from "@/app/components/PermissionGuard";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { useAuth } from "@/app/providers/AuthProvider";

import {
  lockPayrollPeriod,
  unlockPayrollPeriod,
} from "./services/payrollService";

import PayrollAttentionTable from "./components/PayrollAttentionTable";
import PayrollPeriodStatus from "./components/PayrollPeriodStatus";
import PayrollHeader from "./components/PayrollHeader";
import PayrollSummaryCards from "./components/PayrollSummaryCards";
import PayrollEmployeesSection from "./components/PayrollEmployeesSection";
import PayrollAdjustmentsSection from "./components/PayrollAdjustmentsSection";
import PayrollAdvancedAnalysisSection from "./components/PayrollAdvancedAnalysisSection";
import PayrollMasterCinemaRequired from "./components/PayrollMasterCinemaRequired";
import PayrollModals from "./components/PayrollModals";

import { usePayrollFilters } from "./hooks/usePayrollFilters";
import { usePayrollData } from "./hooks/usePayrollData";
import { usePayrollStats } from "./hooks/usePayrollStats";
import { usePayrollExport } from "./hooks/usePayrollExport";
import { usePayrollEmployeeExpansion } from "./hooks/usePayrollEmployeeExpansion";

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
  const { expandedEmployeeIds, toggleEmployeeGroup } =
    usePayrollEmployeeExpansion();

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
      <PayrollMasterCinemaRequired onChooseCinema={() => router.push("/master")} />
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

        <PayrollAdvancedAnalysisSection
          auditHistory={auditHistory}
          dailyHoursData={dailyHoursData}
          employeeLoadData={employeeLoadData}
          payrollDistributionData={payrollDistributionData}
        />
      </div>

      <PayrollModals
        confirmDialog={confirmDialog}
        exportModalOpen={exportModalOpen}
        exporting={exporting}
        infoDialog={infoDialog}
        inputDialog={inputDialog}
        onCloseExportModal={() => setExportModalOpen(false)}
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
