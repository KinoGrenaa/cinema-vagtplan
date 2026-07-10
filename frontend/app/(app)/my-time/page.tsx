"use client";

import Link from "next/link";

import InfoModal from "@/app/components/modals/InfoModal";

import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useAuth } from "@/app/providers/AuthProvider";

import MyTimeDayGroupsSection from "./components/list/MyTimeDayGroupsSection";

import MyTimeHeader from "./components/layout/MyTimeHeader";

import MyTimeModals from "./components/MyTimeModals";

import MyTimeSummaryCards from "./components/overview/MyTimeSummaryCards";

import { useMyTimeDayGroupsExpansion } from "./hooks/useMyTimeDayGroupsExpansion";

import { useMyTimeDerivedData } from "./hooks/useMyTimeDerivedData";
import { useMyTimeEdit } from "./hooks/useMyTimeEdit";

import { useMyTimeEntries } from "./hooks/useMyTimeEntries";

import { useMyTimeHistory } from "./hooks/useMyTimeHistory";

import { useMyTimePayrollPeriod } from "./hooks/useMyTimePayrollPeriod";

import { useMyTimeStatusFilters } from "./hooks/useMyTimeStatusFilters";

export default function MyTimePage() {
  const { user, loading: authLoading } = useAuth();

  const infoDialog = useInfoModal();
  const { expandedDayKeys, resetExpandedDayKeys, toggleDayGroup } =
    useMyTimeDayGroupsExpansion();

  const isGlobalMaster = user?.role === "MASTER" && !user?.cinemaId;

  const dataFetchDisabled = authLoading || Boolean(isGlobalMaster);

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
    { disabled: dataFetchDisabled },
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
    disabled: dataFetchDisabled,
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

  if (authLoading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto w-full max-w-5xl">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Indlæser...
          </p>
        </div>
      </main>
    );
  }

  if (isGlobalMaster) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto w-full max-w-5xl rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Ingen egen biograf
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Mine timer kræver en biografbruger
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-700 dark:text-gray-200">
            MASTER-brugere er globale og har ikke egne timeregistreringer.
            Vælg en aktiv biograf i MASTER-panelet og brug løn- eller
            tidsgodkendelse for biografens medarbejdere.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/master"
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-950 dark:hover:bg-white"
            >
              Gå til MASTER-panel
            </Link>

            <Link
              href="/time-approval"
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              Åbn tidsgodkendelse
            </Link>
          </div>
        </div>
      </main>
    );
  }

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
