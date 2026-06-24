"use client";

import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import MyTimeDayGroupsSection from "./components/MyTimeDayGroupsSection";
import MyTimeHeader from "./components/MyTimeHeader";
import MyTimeModals from "./components/MyTimeModals";
import MyTimeSummaryCards from "./components/MyTimeSummaryCards";
import { useMyTimeDayGroupsExpansion } from "./hooks/useMyTimeDayGroupsExpansion";
import { useMyTimeDerivedData } from "./hooks/useMyTimeDerivedData";
import { useMyTimeEdit } from "./hooks/useMyTimeEdit";
import { useMyTimeEntries } from "./hooks/useMyTimeEntries";
import { useMyTimeHistory } from "./hooks/useMyTimeHistory";
import { useMyTimePayrollPeriod } from "./hooks/useMyTimePayrollPeriod";
import { useMyTimeStatusFilters } from "./hooks/useMyTimeStatusFilters";

export default function MyTimePage() {
  const infoDialog = useInfoModal();

  const { expandedDayKeys, resetExpandedDayKeys, toggleDayGroup } =
    useMyTimeDayGroupsExpansion();

  const {
    statusFilters,
    draftStatusFilters,
    filterModalOpen,
    activeStatusFilterCount,
    statusFilterSummary,
    openFilterModal,
    closeFilterModal,
    updateDraftStatusFilter,
    applyStatusFilters,
    resetStatusFilters,
    showNeedsChangesEntries,
  } = useMyTimeStatusFilters({
    onFiltersChanged: resetExpandedDayKeys,
  });

  const { entries, loading, fetchEntries } = useMyTimeEntries(
    infoDialog.showError,
  );

  const {
    payrollPeriod,
    payrollPeriodLoading,
    goToPreviousPayrollPeriod,
    goToCurrentPayrollPeriod,
    goToNextPayrollPeriod,
  } = useMyTimePayrollPeriod({
    onError: infoDialog.showError,
    onPayrollPeriodChanged: resetExpandedDayKeys,
  });

  const { historyEntry, historyItems, openHistory, closeHistory } =
    useMyTimeHistory(infoDialog.showError);

  const {
    editingEntry,
    editClockIn,
    editClockOut,
    editClockInNote,
    editClockOutNote,
    savingEdit,
    openEdit,
    closeEdit,
    saveEdit,
    setEditClockIn,
    setEditClockOut,
    setEditClockInNote,
    setEditClockOutNote,
  } = useMyTimeEdit({
    onSaved: fetchEntries,
    onError: infoDialog.showError,
  });

  const {
    visibleEntries,
    approvedHours,
    pendingHours,
    needsChangesCount,
    dayGroups,
  } = useMyTimeDerivedData({
    entries,
    payrollPeriod,
    statusFilters,
  });

  return (
    <>
      <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto w-full max-w-5xl">
          <MyTimeHeader
            statusFilterSummary={statusFilterSummary}
            needsChangesCount={needsChangesCount}
            activeStatusFilterCount={activeStatusFilterCount}
            payrollPeriod={payrollPeriod}
            payrollPeriodLoading={payrollPeriodLoading}
            onOpenFilterModal={openFilterModal}
            onShowNeedsChangesEntries={showNeedsChangesEntries}
            onPreviousPayrollPeriod={goToPreviousPayrollPeriod}
            onCurrentPayrollPeriod={goToCurrentPayrollPeriod}
            onNextPayrollPeriod={goToNextPayrollPeriod}
          />

          <MyTimeSummaryCards
            approvedHours={approvedHours}
            pendingHours={pendingHours}
            needsChangesCount={needsChangesCount}
            onShowNeedsChangesEntries={showNeedsChangesEntries}
          />

          <MyTimeDayGroupsSection
            loading={loading}
            visibleEntryCount={visibleEntries.length}
            dayGroups={dayGroups}
            expandedDayKeys={expandedDayKeys}
            onToggleDayGroup={toggleDayGroup}
            onEdit={openEdit}
            onHistory={openHistory}
          />

          <MyTimeModals
            editingEntry={editingEntry}
            editClockIn={editClockIn}
            editClockOut={editClockOut}
            editClockInNote={editClockInNote}
            editClockOutNote={editClockOutNote}
            savingEdit={savingEdit}
            onClockInChange={setEditClockIn}
            onClockOutChange={setEditClockOut}
            onClockInNoteChange={setEditClockInNote}
            onClockOutNoteChange={setEditClockOutNote}
            onCloseEdit={closeEdit}
            onSaveEdit={saveEdit}
            filterModalOpen={filterModalOpen}
            activeStatusFilterCount={activeStatusFilterCount}
            draftStatusFilters={draftStatusFilters}
            onApplyStatusFilters={applyStatusFilters}
            onResetStatusFilters={resetStatusFilters}
            onCloseFilterModal={closeFilterModal}
            onStatusFilterChange={updateDraftStatusFilter}
            historyEntry={historyEntry}
            historyItems={historyItems}
            onCloseHistory={closeHistory}
          />
        </div>
      </main>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </>
  );
}
