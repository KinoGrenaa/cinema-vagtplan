"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminGuard from "@/app/components/AdminGuard";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import InputModal from "@/app/components/modals/InputModal";
import TimeEntryEditModal from "@/app/components/modals/TimeEntryEditModal";
import TimeEntryHistoryModal from "@/app/components/time-entries/TimeEntryHistoryModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { useAuth } from "@/app/providers/AuthProvider";
import TimeApprovalFilterModal from "./components/filters/TimeApprovalFilterModal";
import TimeApprovalContent from "./components/layout/TimeApprovalContent";
import PayrollAdjustmentConfirmationModal from "./components/modals/PayrollAdjustmentConfirmationModal";
import { useTimeApprovalActions } from "./hooks/useTimeApprovalActions";
import { useTimeApprovalData } from "./hooks/data/useTimeApprovalData";
import { useTimeApprovalFilters } from "./hooks/useTimeApprovalFilters";
import { useTimeApprovalHistory } from "./hooks/useTimeApprovalHistory";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") return null;

  const value = window.localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY);
  const cinemaId = Number(value);

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return null;
  }

  return value;
}

export default function TimeApprovalPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    string | null
  >(null);

  useEffect(() => {
    function updateSelectedCinema() {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    }

    updateSelectedCinema();
    window.addEventListener("storage", updateSelectedCinema);
    window.addEventListener("masterSelectedCinemaChanged", updateSelectedCinema);

    return () => {
      window.removeEventListener("storage", updateSelectedCinema);
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedCinema,
      );
    };
  }, []);

  const needsMasterCinemaSelection =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  const inputDialog = useInputModal();
  const infoDialog = useInfoModal();
  const errorDialog = useConfirm();

  const { entries, loading, fetchEntries } = useTimeApprovalData({
    infoDialog,
    enabled: !needsMasterCinemaSelection,
  });

  const {
    showFilterModal,
    setShowFilterModal,
    employeeSearch,
    setEmployeeSearch,
    showPending,
    setShowPending,
    showNeedsChanges,
    setShowNeedsChanges,
    showApproved,
    setShowApproved,
    showVoided,
    setShowVoided,
    showPlannedEntries,
    setShowPlannedEntries,
    showManualEntries,
    setShowManualEntries,
    onlyWithDeviations,
    setOnlyWithDeviations,
    onlyWithNotes,
    setOnlyWithNotes,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    expandedEntryIds,
    expandedUserIds,
    toggleEntryDetails,
    toggleUserGroup,
    visibleEntries,
    pendingCount,
    approvedCount,
    needsChangesCount,
    voidedCount,
    activeFilterCount,
    resetFilters,
    groupedEntries,
  } = useTimeApprovalFilters(entries);

  const { historyItems, historyEntry, openHistory, closeHistory } =
    useTimeApprovalHistory({
      infoDialog,
    });

  const {
    editEntry,
    setEditEntry,
    savingEdit,
    saveEdit,
    payrollAdjustmentConfirmation,
    setPayrollAdjustmentConfirmation,
    confirmingPayrollAdjustment,
    confirmPayrollAdjustmentApproval,
    approve,
    unapprove,
    sendBackForChanges,
    voidEntry,
  } = useTimeApprovalActions({
    inputDialog,
    infoDialog,
    errorDialog,
    fetchEntries,
  });

  return (
    <>
      <AdminGuard>
        {needsMasterCinemaSelection ? (
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Biograf mangler
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Ingen aktiv biograf valgt
            </h1>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              Vælg først en biograf i MASTER-panelet, før du godkender
              tidsregistreringer.
            </p>
            <button
              type="button"
              onClick={() => router.push("/master")}
              className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700"
            >
              Gå til MASTER-panel
            </button>
          </div>
        ) : (
          <>
            <TimeApprovalContent
              loading={loading}
              entriesCount={entries.length}
              visibleEntriesCount={visibleEntries.length}
              activeFilterCount={activeFilterCount}
              employeeSearch={employeeSearch}
              pendingCount={pendingCount}
              needsChangesCount={needsChangesCount}
              groups={groupedEntries}
              expandedUserIds={expandedUserIds}
              expandedEntryIds={expandedEntryIds}
              onEmployeeSearchChange={setEmployeeSearch}
              onOpenFilters={() => setShowFilterModal(true)}
              onResetFilters={resetFilters}
              onToggleGroup={toggleUserGroup}
              onToggleEntryDetails={toggleEntryDetails}
              onEdit={setEditEntry}
              onOpenHistory={openHistory}
              onApprove={approve}
              onUnapprove={unapprove}
              onSendBackForChanges={sendBackForChanges}
              onVoid={voidEntry}
            />

            {editEntry && (
              <TimeEntryEditModal
                open={!!editEntry}
                clockIn={editEntry.clockIn}
                clockOut={editEntry.clockOut}
                loading={savingEdit}
                onClose={() => setEditEntry(null)}
                onSave={saveEdit}
              />
            )}

            <TimeApprovalFilterModal
              open={showFilterModal}
              activeFilterCount={activeFilterCount}
              pendingCount={pendingCount}
              needsChangesCount={needsChangesCount}
              approvedCount={approvedCount}
              voidedCount={voidedCount}
              showPending={showPending}
              showNeedsChanges={showNeedsChanges}
              showApproved={showApproved}
              showVoided={showVoided}
              showPlannedEntries={showPlannedEntries}
              showManualEntries={showManualEntries}
              onlyWithDeviations={onlyWithDeviations}
              onlyWithNotes={onlyWithNotes}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onApply={() => setShowFilterModal(false)}
              onClose={() => setShowFilterModal(false)}
              onReset={resetFilters}
              onShowPendingChange={setShowPending}
              onShowNeedsChangesChange={setShowNeedsChanges}
              onShowApprovedChange={setShowApproved}
              onShowVoidedChange={setShowVoided}
              onShowPlannedEntriesChange={setShowPlannedEntries}
              onShowManualEntriesChange={setShowManualEntries}
              onOnlyWithDeviationsChange={setOnlyWithDeviations}
              onOnlyWithNotesChange={setOnlyWithNotes}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </>
        )}
      </AdminGuard>

      <TimeEntryHistoryModal
        isOpen={!!historyEntry}
        onClose={closeHistory}
        revisions={historyItems}
        currentStatus={historyEntry?.status}
      />

      <PayrollAdjustmentConfirmationModal
        confirmation={payrollAdjustmentConfirmation}
        loading={confirmingPayrollAdjustment}
        onCancel={() => setPayrollAdjustmentConfirmation(null)}
        onConfirm={confirmPayrollAdjustmentApproval}
      />

      <ConfirmModal
        open={errorDialog.open}
        title={errorDialog.title}
        description={errorDialog.description}
        confirmText={errorDialog.confirmText}
        cancelText={errorDialog.cancelText}
        confirmVariant={errorDialog.confirmVariant}
        loading={errorDialog.loading}
        onConfirm={errorDialog.handleConfirm}
        onCancel={errorDialog.handleCancel}
      />

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />

      <InputModal
        open={inputDialog.open}
        title={inputDialog.title}
        description={inputDialog.description}
        label={inputDialog.label}
        placeholder={inputDialog.placeholder}
        value={inputDialog.value}
        confirmText={inputDialog.confirmText}
        cancelText={inputDialog.cancelText}
        loading={inputDialog.loading}
        required={inputDialog.required}
        onChange={inputDialog.setValue}
        onConfirm={inputDialog.handleConfirm}
        onCancel={inputDialog.handleCancel}
      />
    </>
  );
}
