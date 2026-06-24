"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import InfoModal from "@/app/components/modals/InfoModal";
import TimeEntryHistoryModal from "@/app/components/time-entries/TimeEntryHistoryModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import MyTimeDayGroupsSection from "./components/MyTimeDayGroupsSection";
import MyTimeEditModal from "./components/MyTimeEditModal";
import MyTimeFilterModal from "./components/MyTimeFilterModal";
import MyTimeSummaryCards from "./components/MyTimeSummaryCards";
import {
  addDays,
  dateToLocalDateString,
  formatDate,
  toInputDateTime,
} from "./helpers/myTimeDate";
import {
  isEntryVisibleWithStatusFilters,
  isInPayrollPeriod,
} from "./helpers/myTimeEntries";
import {
  DEFAULT_STATUS_FILTERS,
  type MyTimeStatusFilters,
  getActiveStatusFilterCount,
  getStatusFilterSummary,
} from "./helpers/myTimeStatus";
import {
  getApprovedHours,
  getMyTimeDayGroups,
  getNeedsChangesCount,
  getPendingHours,
} from "./helpers/myTimeSummary";
import type { TimeEntry, TimeEntryRevision } from "./helpers/myTimeTypes";

export default function MyTimePage() {
  const infoDialog = useInfoModal();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [payrollPeriod, setPayrollPeriod] = useState(() => {
    const today = dateToLocalDateString(new Date());

    return {
      startDate: today,
      endDate: today,
    };
  });
  const [payrollPeriodLoading, setPayrollPeriodLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editClockInNote, setEditClockInNote] = useState("");
  const [editClockOutNote, setEditClockOutNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusFilters, setStatusFilters] = useState<MyTimeStatusFilters>(
    DEFAULT_STATUS_FILTERS,
  );
  const [draftStatusFilters, setDraftStatusFilters] =
    useState<MyTimeStatusFilters>(DEFAULT_STATUS_FILTERS);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [expandedDayKeys, setExpandedDayKeys] = useState<string[]>([]);

  const [historyEntry, setHistoryEntry] = useState<TimeEntry | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<TimeEntryRevision[]>([]);

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

        setExpandedDayKeys([]);
      } catch {
        infoDialog.showError(
          "Kunne ikke hente lønperiode",
          "Der opstod en fejl, da lønperioden skulle hentes. Prøv igen.",
        );
      } finally {
        setPayrollPeriodLoading(false);
      }
    },
    [],
  );

  useRealtimeCore({
    onTimeEntry: fetchEntries,
  });

  function openEdit(entry: TimeEntry) {
    setEditingEntry(entry);
    setEditClockIn(toInputDateTime(entry.clockIn));
    setEditClockOut(toInputDateTime(entry.clockOut));
    setEditClockInNote(entry.clockInNote ?? "");
    setEditClockOutNote(entry.clockOutNote ?? "");
  }

  function closeEdit() {
    if (savingEdit) return;

    setEditingEntry(null);
    setEditClockIn("");
    setEditClockOut("");
    setEditClockInNote("");
    setEditClockOutNote("");
  }

  function getErrorMessage(errorText: string) {
    try {
      const parsed = JSON.parse(errorText);

      if (typeof parsed?.message === "string") {
        return parsed.message;
      }

      if (Array.isArray(parsed?.message)) {
        return parsed.message.join("\n");
      }
    } catch {
      // Ikke JSON - brug teksten som den er
    }

    return errorText || "Kunne ikke rette timeregistrering";
  }

  async function saveEdit() {
    if (!editingEntry) return;

    const parsedClockIn = new Date(editClockIn);
    const parsedClockOut = editClockOut ? new Date(editClockOut) : null;

    if (Number.isNaN(parsedClockIn.getTime())) {
      infoDialog.showError(
        "Ugyldig mødetid",
        "Mødetiden er ikke en gyldig dato eller tid.",
      );

      return;
    }

    if (parsedClockOut && Number.isNaN(parsedClockOut.getTime())) {
      infoDialog.showError(
        "Ugyldig fyraften",
        "Fyraften er ikke en gyldig dato eller tid.",
      );

      return;
    }

    if (parsedClockOut && parsedClockOut <= parsedClockIn) {
      infoDialog.showError(
        "Ugyldigt tidsrum",
        "Fyraften skal være efter mødetid.",
      );

      return;
    }

    try {
      setSavingEdit(true);

      const response = await apiFetch(`/time-entries/me/${editingEntry.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          clockIn: parsedClockIn.toISOString(),
          clockOut: parsedClockOut ? parsedClockOut.toISOString() : null,
          clockInNote: editClockInNote,
          clockOutNote: editClockOutNote,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();

        infoDialog.showError(
          "Timeregistreringen kunne ikke rettes",
          getErrorMessage(errorText),
        );

        return;
      }

      await fetchEntries();
      closeEdit();
      toast.success("Timeregistrering rettet");
    } catch {
      infoDialog.showError(
        "Timeregistreringen kunne ikke rettes",
        "Der opstod en fejl, da timeregistreringen skulle rettes. Prøv igen.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function openHistory(entry: TimeEntry) {
    try {
      setHistoryLoading(true);
      setHistoryEntry(entry);

      const response = await apiFetch(`/time-entries/${entry.id}/revisions`);

      if (!response.ok) {
        infoDialog.showError(
          "Kunne ikke hente historik",
          "Der opstod en fejl, da historikken skulle hentes. Prøv igen.",
        );

        setHistoryEntry(null);
        return;
      }

      const data = await response.json();

      setHistoryItems(Array.isArray(data) ? data : []);
    } catch {
      infoDialog.showError(
        "Kunne ikke hente historik",
        "Der opstod en fejl, da historikken skulle hentes. Prøv igen.",
      );

      setHistoryEntry(null);
    } finally {
      setHistoryLoading(false);
    }
  }

  function openFilterModal() {
    setDraftStatusFilters(statusFilters);
    setFilterModalOpen(true);
  }

  function closeFilterModal() {
    setFilterModalOpen(false);
  }

  function updateDraftStatusFilter(
    key: keyof MyTimeStatusFilters,
    checked: boolean,
  ) {
    setDraftStatusFilters((current) => ({
      ...current,
      [key]: checked,
    }));
  }

  function applyStatusFilters() {
    setStatusFilters(draftStatusFilters);
    setExpandedDayKeys([]);
    setFilterModalOpen(false);
  }

  function resetStatusFilters() {
    setDraftStatusFilters(DEFAULT_STATUS_FILTERS);
    setStatusFilters(DEFAULT_STATUS_FILTERS);
    setExpandedDayKeys([]);
    setFilterModalOpen(false);
  }

  function showNeedsChangesEntries() {
    const needsChangesOnlyFilters: MyTimeStatusFilters = {
      approved: false,
      pending: false,
      needsChanges: true,
      voided: false,
    };

    setStatusFilters(needsChangesOnlyFilters);
    setDraftStatusFilters(needsChangesOnlyFilters);
    setExpandedDayKeys([]);
  }

  function toggleDayGroup(dayKey: string) {
    setExpandedDayKeys((current) =>
      current.includes(dayKey)
        ? current.filter((key) => key !== dayKey)
        : [...current, dayKey],
    );
  }

  function goToPreviousPayrollPeriod() {
    const referenceDate = dateToLocalDateString(
      addDays(new Date(`${payrollPeriod.startDate}T00:00:00`), -1),
    );

    fetchPayrollPeriodForDate(referenceDate);
  }

  function goToCurrentPayrollPeriod() {
    fetchPayrollPeriodForDate(dateToLocalDateString(new Date()));
  }

  function goToNextPayrollPeriod() {
    const referenceDate = dateToLocalDateString(
      addDays(new Date(`${payrollPeriod.endDate}T00:00:00`), 1),
    );

    fetchPayrollPeriodForDate(referenceDate);
  }

  useEffect(() => {
    fetchPayrollPeriodForDate(dateToLocalDateString(new Date()));
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

  const activeStatusFilterCount = useMemo(() => {
    return getActiveStatusFilterCount(statusFilters);
  }, [statusFilters]);

  const statusFilterSummary = useMemo(() => {
    return getStatusFilterSummary(statusFilters);
  }, [statusFilters]);

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
          <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold">Mine timer</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Se dine indberettede og godkendte timer.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
                    Viser: {statusFilterSummary}
                  </span>

                  {needsChangesCount > 0 && (
                    <span className="rounded-full bg-orange-50 px-3 py-1 font-medium text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                      {needsChangesCount} kræver handling
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={openFilterModal}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                  >
                    Filter
                    {activeStatusFilterCount > 0
                      ? ` (${activeStatusFilterCount})`
                      : ""}
                  </button>

                  {needsChangesCount > 0 && (
                    <button
                      type="button"
                      onClick={showNeedsChangesEntries}
                      className="inline-flex items-center justify-center rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                    >
                      Vis det der skal rettes
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40 lg:w-auto lg:min-w-72">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Lønperiode
                </div>

                <div className="mt-1 text-base font-semibold">
                  {formatDate(payrollPeriod.startDate)} →{" "}
                  {formatDate(payrollPeriod.endDate)}
                </div>

                {payrollPeriodLoading && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Henter lønperiode...
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={goToPreviousPayrollPeriod}
                    disabled={payrollPeriodLoading}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                  >
                    Forrige
                  </button>

                  <button
                    type="button"
                    onClick={goToCurrentPayrollPeriod}
                    disabled={payrollPeriodLoading}
                    className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Aktuel
                  </button>

                  <button
                    type="button"
                    onClick={goToNextPayrollPeriod}
                    disabled={payrollPeriodLoading}
                    className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                  >
                    Næste
                  </button>
                </div>
              </div>
            </div>
          </div>

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
            onClose={() => {
              setHistoryEntry(null);
              setHistoryItems([]);
            }}
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
