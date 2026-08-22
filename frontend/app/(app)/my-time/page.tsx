"use client";

import Link from "next/link";

import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useAuth } from "@/app/providers/AuthProvider";

import MyTimeDayGroupsSection from "./components/list/MyTimeDayGroupsSection";
import MyTimeHeader from "./components/layout/MyTimeHeader";
import MyTimeModals from "./components/modals/MyTimeModals";
import MyTimeSummaryCards from "./components/overview/MyTimeSummaryCards";
import { useMyTimeEdit } from "./hooks/actions/useMyTimeEdit";
import { useMyTimeHistory } from "./hooks/actions/useMyTimeHistory";
import { useMyTimeEntries } from "./hooks/data/useMyTimeEntries";
import { useMyTimePayrollPeriod } from "./hooks/data/useMyTimePayrollPeriod";
import { useMyTimeDerivedData } from "./hooks/derived/useMyTimeDerivedData";
import { useMyTimeDayGroupsExpansion } from "./hooks/state/useMyTimeDayGroupsExpansion";
import { useMyTimeStatusFilters } from "./hooks/state/useMyTimeStatusFilters";

const focusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950";

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
    editNote,
    editClockInNote,
    editClockOutNote,
    savingEdit,
    openEdit,
    closeEdit,
    saveEdit,
    setEditClockIn,
    setEditClockOut,
    setEditNote,
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
      <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto w-full max-w-5xl">
          <div
            role="status"
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              Indlæser dine timer...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (isGlobalMaster) {
    return (
      <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto w-full max-w-5xl rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
            Ingen egen biograf
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-950 dark:text-white">
            Mine timer kræver en biografbruger
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-700 dark:text-gray-200">
            MASTER-brugere er globale og har ikke egne timeregistreringer. Vælg
            en aktiv biograf i MASTER-panelet og brug løn- eller
            tidsgodkendelse for biografens medarbejdere.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/master"
              className={`rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus-visible:ring-gray-600 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200 dark:focus-visible:ring-gray-300 ${focusClass}`}
            >
              Gå til MASTER-panel
            </Link>
            <Link
              href="/time-approval"
              className={`rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-50 focus-visible:ring-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:focus-visible:ring-blue-400 ${focusClass}`}
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
      <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
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
            editNote={editNote}
            editClockInNote={editClockInNote}
            editClockOutNote={editClockOutNote}
            savingEdit={savingEdit}
            onClockInChange={setEditClockIn}
            onClockOutChange={setEditClockOut}
            onNoteChange={setEditNote}
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
