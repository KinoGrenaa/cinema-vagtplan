"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import InfoModal from "@/app/components/modals/InfoModal";
import TimeEntryHistoryModal from "@/app/components/time-entries/TimeEntryHistoryModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import MyTimeEditModal from "./components/MyTimeEditModal";
import MyTimeFilterModal from "./components/MyTimeFilterModal";
import MyTimeSummaryCards from "./components/MyTimeSummaryCards";
import {
  addDays,
  dateToLocalDateString,
  formatDate,
  formatDateTime,
  toInputDateTime,
} from "./helpers/myTimeDate";
import {
  getHours,
  isEntryVisibleWithStatusFilters,
  isInPayrollPeriod,
} from "./helpers/myTimeEntries";
import {
  getEntrySingleNote,
  shouldShowEntryNoteAsSingleNote,
} from "./helpers/myTimeNotes";
import {
  DEFAULT_STATUS_FILTERS,
  type MyTimeStatusFilters,
  getActiveStatusFilterCount,
  getStatusClass,
  getStatusFilterSummary,
  getStatusLabel,
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

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Henter timer...
          </div>
        )}

        {!loading && visibleEntries.length === 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Der er ingen timer, der matcher det valgte filter i den aktuelle
            lønperiode.
          </div>
        )}

        {!loading && visibleEntries.length > 0 && (
          <div className="space-y-4">
            {dayGroups.map((group) => {
              const isExpanded = expandedDayKeys.includes(group.dayKey);

              return (
                <div
                  key={group.dayKey}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <button
                    type="button"
                    onClick={() => toggleDayGroup(group.dayKey)}
                    className="flex w-full flex-col gap-3 p-5 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/60 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="text-lg font-bold capitalize">
                        {group.label}
                      </div>

                      {group.summaryParts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.summaryParts.map((part) => {
                            let className =
                              "rounded-full px-2 py-1 text-xs font-medium";

                            if (part.startsWith("Godkendt:")) {
                              className +=
                                " bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
                            } else if (part.startsWith("Afventer:")) {
                              className +=
                                " bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
                            } else if (part.startsWith("Kræver handling:")) {
                              className +=
                                " bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
                            } else if (part.startsWith("Afvist/annulleret:")) {
                              className +=
                                " bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
                            }

                            return (
                              <span key={part} className={className}>
                                {part}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="rounded-xl border border-gray-300 px-3 py-1 text-sm font-medium dark:border-gray-700">
                        {isExpanded ? "Fold ind" : "Fold ud"}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-4 border-t border-gray-200 p-5 dark:border-gray-800">
                      {group.entries.map((entry) => (
                        <div
                          key={entry.id}
                          className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40"
                        >
                          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <h2 className="text-lg font-bold">
                                {entry.shift?.workType?.name ||
                                  entry.payrollType?.name ||
                                  "Timeregistrering"}
                              </h2>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDateTime(entry.clockIn)}
                              </p>
                            </div>

                            <span
                              className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                entry.status,
                              )}`}
                            >
                              {getStatusLabel(entry.status)}
                            </span>
                          </div>

                          <div className="grid gap-2 text-sm md:grid-cols-2">
                            <div>
                              <span className="font-semibold">Mødetid:</span>{" "}
                              {formatDateTime(entry.clockIn)}
                            </div>

                            <div>
                              <span className="font-semibold">Fyraften:</span>{" "}
                              {formatDateTime(entry.clockOut)}
                            </div>

                            <div>
                              <span className="font-semibold">Timer:</span>{" "}
                              {getHours(entry)}
                            </div>

                            <div>
                              <span className="font-semibold">Status:</span>{" "}
                              {getStatusLabel(entry.status)}
                            </div>
                          </div>

                          {(entry.note ||
                            entry.clockInNote ||
                            entry.clockOutNote ||
                            entry.adminNote) && (
                            <div className="mt-4 space-y-3">
                              {shouldShowEntryNoteAsSingleNote(entry) ? (
                                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
                                  <span className="font-semibold">Note:</span>{" "}
                                  {getEntrySingleNote(entry)}
                                </div>
                              ) : (
                                <>
                                  {entry.clockInNote && (
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
                                      <span className="font-semibold">
                                        Mødetidsnote:
                                      </span>{" "}
                                      {entry.clockInNote}
                                    </div>
                                  )}

                                  {entry.clockOutNote && (
                                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
                                      <span className="font-semibold">
                                        Fyraftensnote:
                                      </span>{" "}
                                      {entry.clockOutNote}
                                    </div>
                                  )}
                                </>
                              )}

                              {entry.adminNote && (
                                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950/40">
                                  <div className="font-semibold">
                                    {entry.status === "NEEDS_CHANGES"
                                      ? "Besked fra administrationen"
                                      : "Note fra administrationen"}
                                  </div>

                                  <div className="mt-1">{entry.adminNote}</div>
                                </div>
                              )}
                            </div>
                          )}

                          {entry.status === "NEEDS_CHANGES" && (
                            <div className="mt-4 rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm font-medium text-orange-900 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
                              Denne tidsregistrering er sendt retur til rettelse
                              og skal opdateres før den kan godkendes.
                            </div>
                          )}

                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              onClick={() => openHistory(entry)}
                              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                            >
                              Historik
                            </button>

                            {entry.status !== "APPROVED" &&
                              entry.status !== "VOIDED" && (
                                <button
                                  onClick={() => openEdit(entry)}
                                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                                >
                                  Redigér
                                </button>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

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
