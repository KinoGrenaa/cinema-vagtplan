"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PermissionGuard from "@/app/components/PermissionGuard";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { useAuth } from "@/app/providers/AuthProvider";

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
import { usePayrollMasterCinema } from "./hooks/usePayrollMasterCinema";
import { usePayrollPeriodActions } from "./hooks/usePayrollPeriodActions";

export default function PayrollPage() {
  const router = useRouter();
  const { user } = useAuth();
  const inputDialog = useInputModal();
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();
  const { isMasterWithoutActiveCinema } = usePayrollMasterCinema(user);

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

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { expandedEmployeeIds, toggleEmployeeGroup } =
    usePayrollEmployeeExpansion();
  const { locking, lockPeriod, unlocking, unlockPeriod } =
    usePayrollPeriodActions({
      confirmDialog,
      endDate,
      infoDialog,
      inputDialog,
      periodId: period?.id,
      refreshPayroll,
      startDate,
    });

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
