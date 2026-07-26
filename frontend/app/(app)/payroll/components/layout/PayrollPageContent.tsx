import type { usePayrollPage } from "../../hooks/usePayrollPage";
import PayrollModals from "../modals/PayrollModals";
import PayrollAttentionTable from "../overview/PayrollAttentionTable";
import PayrollPeriodStatus from "../overview/PayrollPeriodStatus";
import PayrollSummaryCards from "../overview/PayrollSummaryCards";
import PayrollAdjustmentsSection from "../report/PayrollAdjustmentsSection";
import PayrollAdvancedAnalysisSection from "../report/PayrollAdvancedAnalysisSection";
import PayrollEmployeesSection from "../report/PayrollEmployeesSection";
import PayrollHeader from "./PayrollHeader";
import styles from "./PayrollPageContent.module.css";

type PayrollPageState = ReturnType<typeof usePayrollPage>;

type PayrollPageContentProps = {
  payrollPage: PayrollPageState;
};

export default function PayrollPageContent({
  payrollPage,
}: PayrollPageContentProps) {
  const {
    adjustmentCount,
    auditHistory,
    auditHistoryLoading,
    cinemaSettings,
    closeExportModal,
    confirmDialog,
    dailyHoursData,
    employeeLoadData,
    endDate,
    ensurePayrollHistory,
    eveningHours,
    expandedEmployeeIds,
    exportModalOpen,
    exportPayroll,
    exporting,
    handleApplyCurrentPayrollPeriod,
    handleNextPayrollPeriod,
    handleOpenTimeApproval,
    handlePreviousPayrollPeriod,
    inputDialog,
    infoDialog,
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
  } = payrollPage;

  return (
    <>
      <div
        className={`${styles.payrollPage} min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100`}
      >
        <div className="mx-auto max-w-7xl space-y-6 p-6">
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
            onApplyCurrentPayrollPeriod={handleApplyCurrentPayrollPeriod}
            onNextPayrollPeriod={handleNextPayrollPeriod}
            onPreviousPayrollPeriod={handlePreviousPayrollPeriod}
            onRefreshPayroll={refreshPayroll}
            onSetEndDate={setEndDate}
            onSetStartDate={setStartDate}
            onSetUserId={setUserId}
            onToggleAdvancedFilters={toggleAdvancedFilters}
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
            onOpenExportModal={openExportModal}
            onOpenTimeApproval={handleOpenTimeApproval}
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
            auditHistoryLoading={auditHistoryLoading}
            dailyHoursData={dailyHoursData}
            employeeLoadData={employeeLoadData}
            payrollDistributionData={payrollDistributionData}
            onShowAnalysis={ensurePayrollHistory}
          />
        </div>
      </div>
      <PayrollModals
        confirmDialog={confirmDialog}
        exportModalOpen={exportModalOpen}
        exporting={exporting}
        infoDialog={infoDialog}
        inputDialog={inputDialog}
        onCloseExportModal={closeExportModal}
        onExport={exportPayroll}
      />
    </>
  );
}
