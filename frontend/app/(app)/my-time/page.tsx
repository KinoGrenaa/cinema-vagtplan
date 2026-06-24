"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import TimeEntryHistoryModal from "@/app/components/time-entries/TimeEntryHistoryModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import MyTimeDayGroupsSection from "./components/MyTimeDayGroupsSection";
import MyTimeEditModal from "./components/MyTimeEditModal";
import MyTimeFilterModal from "./components/MyTimeFilterModal";
import MyTimeHeader from "./components/MyTimeHeader";
import MyTimeSummaryCards from "./components/MyTimeSummaryCards";
import {
  getCurrentPayrollPeriodReferenceDate,
  getInitialPayrollPeriod,
  getNextPayrollPeriodReferenceDate,
  getPreviousPayrollPeriodReferenceDate,
} from "./helpers/myTimePayrollPeriod";
import {
  isEntryVisibleWithStatusFilters,
  isInPayrollPeriod,
} from "./helpers/myTimeEntries";
import { useMyTimeStatusFilters } from "./hooks/useMyTimeStatusFilters";
import { useMyTimeDayGroupsExpansion } from "./hooks/useMyTimeDayGroupsExpansion";
import { useMyTimeHistory } from "./hooks/useMyTimeHistory";
import { useMyTimeEdit } from "./hooks/useMyTimeEdit";
import {
  getApprovedHours,
  getMyTimeDayGroups,
  getNeedsChangesCount,
  getPendingHours,
} from "./helpers/myTimeSummary";
import type { TimeEntry } from "./helpers/myTimeTypes";

export default function MyTimePage() {
  const infoDialog = useInfoModal();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [payrollPeriod, setPayrollPeriod] = useState(getInitialPayrollPeriod);
  const [payrollPeriodLoading, setPayrollPeriodLoading] = useState(false);
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

  const { historyEntry, historyItems, openHistory, closeHistory } =
    useMyTimeHistory(infoDialog.showError);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiFetch("/time-entries/me");

      if (!response.ok) {
        setEntries([]);

        infoDialog.showError(
          "Kunne ikke hente dine timer",
          "Der opstod en fejl, da dine timer skulle hentes. Prøv igen.",
        );

        return;
      }

      const data = await response.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);

      infoDialog.showError(
        "Kunne ikke hente dine timer",
        "Der opstod en fejl, da dine timer skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

  const fetchPayrollPeriodForDate = useCallback(
    async (referenceDate: string) => {
      try {
        setPayrollPeriodLoading(true);

        const response = await apiFetch(
          `/payroll/period-for-date?date=${encodeURIComponent(referenceDate)}`,
        );

        if (!response.ok) {
          infoDialog.showError(
            "Kunne ikke hente lønperiode",
            "Der opstod en fejl, da lønperioden skulle hentes. Prøv igen.",
          );

          return;
        }

        const data = await response.json();

        if (
          typeof data?.startDate !== "string" ||
          typeof data?.endDate !== "string"
        ) {
          infoDialog.showError(
            "Ugyldig lønperiode",
            "Serveren returnerede en ugyldig lønperiode.",
          );

          return;
        }

        setPayrollPeriod({
          startDate: data.startDate.slice(0, 10),
          endDate: data.endDate.slice(0, 10),
        });

        resetExpandedDayKeys();
      } catch {
        infoDialog.showError(
          "Kunne ikke hente lønperiode",
          "Der opstod en fejl, da lønperioden skulle hentes. Prøv igen.",
        );
      } finally {
        setPayrollPeriodLoading(false);
      }
    },
    [resetExpandedDayKeys],
  );

  useRealtimeCore({
    onTimeEntry: fetchEntries,
  });

  function goToPreviousPayrollPeriod() {
    fetchPayrollPeriodForDate(
      getPreviousPayrollPeriodReferenceDate(payrollPeriod),
    );
  }

  function goToCurrentPayrollPeriod() {
    fetchPayrollPeriodForDate(getCurrentPayrollPeriodReferenceDate());
  }

  function goToNextPayrollPeriod() {
    fetchPayrollPeriodForDate(getNextPayrollPeriodReferenceDate(payrollPeriod));
  }

  useEffect(() => {
    fetchPayrollPeriodForDate(getCurrentPayrollPeriodReferenceDate());
    fetchEntries();
  }, [fetchEntries, fetchPayrollPeriodForDate]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) =>
      isInPayrollPeriod(entry, payrollPeriod.startDate, payrollPeriod.endDate),
    );
  }, [entries, payrollPeriod.endDate, payrollPeriod.startDate]);

  const visibleEntries = useMemo(() => {
    return filteredEntries.filter((entry) =>
      isEntryVisibleWithStatusFilters(entry, statusFilters),
    );
  }, [filteredEntries, statusFilters]);

  const approvedHours = useMemo(() => {
    return getApprovedHours(filteredEntries);
  }, [filteredEntries]);

  const pendingHours = useMemo(() => {
    return getPendingHours(filteredEntries);
  }, [filteredEntries]);

  const needsChangesCount = useMemo(() => {
    return getNeedsChangesCount(filteredEntries);
  }, [filteredEntries]);

  const dayGroups = useMemo(() => {
    return getMyTimeDayGroups(visibleEntries);
  }, [visibleEntries]);

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

          <MyTimeEditModal
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
            onClose={closeEdit}
            onSave={saveEdit}
          />
          <MyTimeFilterModal
            open={filterModalOpen}
            activeFilterCount={activeStatusFilterCount}
            draftStatusFilters={draftStatusFilters}
            onApply={applyStatusFilters}
            onReset={resetStatusFilters}
            onClose={closeFilterModal}
            onStatusFilterChange={updateDraftStatusFilter}
          />

          <TimeEntryHistoryModal
            isOpen={!!historyEntry}
            onClose={closeHistory}
            revisions={historyItems}
            currentStatus={historyEntry?.status}
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
