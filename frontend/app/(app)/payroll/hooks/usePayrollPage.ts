import { useRouter } from "next/navigation";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { useAuth } from "@/app/providers/AuthProvider";

import { usePayrollAdvancedFilters } from "./usePayrollAdvancedFilters";
import { usePayrollData } from "./usePayrollData";
import { usePayrollEmployeeExpansion } from "./usePayrollEmployeeExpansion";
import { usePayrollExport } from "./usePayrollExport";
import { usePayrollExportModal } from "./usePayrollExportModal";
import { usePayrollFilters } from "./usePayrollFilters";
import { usePayrollMasterCinema } from "./usePayrollMasterCinema";
import { usePayrollPeriodActions } from "./usePayrollPeriodActions";
import { usePayrollStats } from "./usePayrollStats";

export function usePayrollPage() {
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

  const { exportModalOpen, openExportModal, closeExportModal, exportPayroll } =
    usePayrollExportModal({
      downloadExport,
      showError: infoDialog.showError,
    });
  const { showAdvancedFilters, toggleAdvancedFilters } =
    usePayrollAdvancedFilters();
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

  return {
    adjustmentCount,
    auditHistory,
    cinemaSettings,
    closeExportModal,
    confirmDialog,
    dailyHoursData,
    employeeLoadData,
    endDate,
    eveningHours,
    expandedEmployeeIds,
    exportModalOpen,
    exportPayroll,
    exporting,
    handleApplyCurrentPayrollPeriod: () =>
      applyCurrentPayrollPeriod(cinemaSettings),
    handleChooseCinema: () => router.push("/master"),
    handleNextPayrollPeriod: () => nextPayrollPeriod(cinemaSettings),
    handleOpenTimeApproval: () => router.push("/time-approval"),
    handlePreviousPayrollPeriod: () => previousPayrollPeriod(cinemaSettings),
    inputDialog,
    infoDialog,
    isMasterWithoutActiveCinema,
    loading,
    lockPeriod,
    locking,
    nightHours,
    openExportModal,
    overtimeHours,
    overtimeWarnings,
    payrollAdjustmentEmployees,
    payrollDistributionData,
    pendingCount,
    period,
    refreshPayroll,
    report,
    setEndDate,
    setStartDate,
    setUserId,
    showAdvancedFilters,
    startDate,
    toggleAdvancedFilters,
    toggleEmployeeGroup,
    totalHours,
    unlockPeriod,
    unlocking,
    userId,
    users,
    voidedCount,
    weekendHours,
  };
}
