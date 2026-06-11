"use client";

import { useCallback, useEffect, useState } from "react";

import AdminGuard from "@/app/components/AdminGuard";
import InputModal from "@/app/components/modals/InputModal";
import TimeEntryEditModal from "@/app/components/modals/TimeEntryEditModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { toast } from "sonner";
import {
  formatDateTime,
  formatMinutes,
  getStatusClass,
  getStatusLabel,
  readErrorMessage,
} from "./utils";
import type { TimeEntry, TimeEntryStatus } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type TimeEntryRevision = {
  id: number;
  action: string;
  reason?: string | null;
  createdAt: string;

  previousStatus?: string | null;
  newStatus?: string | null;

  previousClockIn?: string | null;
  newClockIn?: string | null;

  previousClockOut?: string | null;
  newClockOut?: string | null;

  previousClockInNote?: string | null;
  newClockInNote?: string | null;

  previousClockOutNote?: string | null;
  newClockOutNote?: string | null;

  previousAdminNote?: string | null;
  newAdminNote?: string | null;

  changedByUser?: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  } | null;
};

function getRevisionActionLabel(action: string) {
  switch (action) {
    case "CREATED":
      return "Oprettet";

    case "UPDATED":
      return "Rettet";

    case "APPROVED":
      return "Godkendt";

    case "UNAPPROVED":
      return "Godkendelse fjernet";

    case "NEEDS_CHANGES":
      return "Sendt retur til rettelse";

    case "VOIDED":
      return "Annulleret";

    case "REOPENED":
      return "Genåbnet";

    default:
      return action;
  }
}

function getRevisionActorLabel(action: string) {
  switch (action) {
    case "CREATED":
      return "Oprettet af";

    case "UPDATED":
      return "Rettet af";

    case "APPROVED":
      return "Godkendt af";

    case "UNAPPROVED":
      return "Godkendelse fjernet af";

    case "NEEDS_CHANGES":
      return "Sendt retur af";

    case "VOIDED":
      return "Annulleret af";

    case "REOPENED":
      return "Genåbnet af";

    default:
      return "Udført af";
  }
}

function getStatusHistoryLabel(status?: string | null) {
  if (!status) return "-";

  switch (status) {
    case "PENDING":
      return "Afventer";

    case "APPROVED":
      return "Godkendt";

    case "NEEDS_CHANGES":
      return "Skal rettes";

    case "VOIDED":
      return "Annulleret";

    default:
      return status;
  }
}

function shouldShowCreatedNoteAsSingleNote(item: TimeEntryRevision) {
  if (item.action !== "CREATED") return false;

  const clockInNote = item.newClockInNote?.trim() || "";
  const clockOutNote = item.newClockOutNote?.trim() || "";

  return clockInNote.length > 0 && clockInNote === clockOutNote;
}

function DeviationPanel({ entry }: { entry: TimeEntry }) {
  const deviation = entry.deviation;
  const isManualEntry = !entry.shift;

  if (!deviation) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-950/40">
        <div className="font-semibold">Afvigelsesanalyse</div>
        <div className="mt-1 text-gray-500 dark:text-gray-400">
          Ingen afvigelsesdata modtaget fra backend.
        </div>
      </div>
    );
  }

  const plannedRange =
    entry.shift?.startTime && entry.shift?.endTime
      ? `${formatDateTime(entry.shift.startTime)} - ${formatDateTime(
          entry.shift.endTime,
        )}`
      : "-";

  const registeredRange = `${formatDateTime(entry.clockIn)} - ${formatDateTime(
    entry.clockOut,
  )}`;

  return (
    <div
      className={`rounded-xl border p-3 text-sm ${
        deviation.hasDeviation
          ? "border-orange-300 bg-orange-50 dark:border-orange-900 dark:bg-orange-950/40"
          : "border-green-300 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
      }`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-semibold">
          {isManualEntry ? "Manuel registrering" : "Afvigelsesanalyse"}
        </span>

        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            deviation.hasDeviation
              ? "bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-100"
              : "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-100"
          }`}
        >
          {isManualEntry
            ? "Manuel registrering"
            : deviation.hasDeviation
              ? "Afvigelse"
              : "OK"}
        </span>

        {!isManualEntry && deviation.requiresNote && (
          <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-semibold text-red-900 dark:bg-red-900 dark:text-red-100">
            Kræver note
          </span>
        )}
      </div>

      <div className="grid gap-1">
        <div>
          <span className="font-semibold">
            {isManualEntry ? "Type:" : "Planlagt:"}
          </span>{" "}
          {isManualEntry ? "Arbejde uden planlagt vagt" : plannedRange}
        </div>

        <div>
          <span className="font-semibold">Registreret:</span> {registeredRange}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {isManualEntry ? (
          <div>
            ℹ️ Denne tidsregistrering er ikke tilknyttet en planlagt vagt.
          </div>
        ) : (
          deviation.messages.map((message, index) => (
            <div key={`${entry.id}-deviation-${index}`}>
              {deviation.hasDeviation ? "⚠️" : "✅"} {message}
            </div>
          ))
        )}
      </div>

      {!isManualEntry && (
        <div className="mt-3 grid gap-1 text-xs opacity-80 sm:grid-cols-2">
          <div>Planlagt tid: {formatMinutes(deviation.plannedMinutes)}</div>
          <div>
            Registreret tid: {formatMinutes(deviation.registeredMinutes)}
          </div>
          <div>Difference: {formatMinutes(deviation.differenceMinutes)}</div>
          <div>
            Mødetidsafvigelse:{" "}
            {formatMinutes(deviation.clockInDeviationMinutes)}
          </div>
          <div>
            Fyraftensafvigelse:{" "}
            {formatMinutes(deviation.clockOutDeviationMinutes)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimeApprovalPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const inputDialog = useInputModal();
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [historyItems, setHistoryItems] = useState<TimeEntryRevision[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<TimeEntry | null>(null);
  const [showApproved, setShowApproved] = useState(false);
  const [showVoided, setShowVoided] = useState(false);
  const [expandedEntryIds, setExpandedEntryIds] = useState<number[]>([]);
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);

  const toggleEntryDetails = (entryId: number) => {
    setExpandedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId],
    );
  };

  const toggleUserGroup = (userId: string) => {
    setExpandedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const visibleEntries = entries.filter((entry) => {
    if (!entry.clockIn || !entry.clockOut) return false;
    if (entry.status === "APPROVED") return showApproved;
    if (entry.status === "VOIDED") return showVoided;
    return true;
  });

  const pendingCount = entries.filter(
    (entry) => entry.clockIn && entry.clockOut && entry.status === "PENDING",
  ).length;

  const approvedCount = entries.filter(
    (entry) => entry.clockIn && entry.clockOut && entry.status === "APPROVED",
  ).length;

  const needsChangesCount = entries.filter(
    (entry) =>
      entry.clockIn && entry.clockOut && entry.status === "NEEDS_CHANGES",
  ).length;

  const voidedCount = entries.filter(
    (entry) => entry.clockIn && entry.clockOut && entry.status === "VOIDED",
  ).length;

  const groupedEntries = Array.from(
    visibleEntries.reduce((groups, entry) => {
      const userKey = entry.user.email;
      const existingGroup = groups.get(userKey);

      if (existingGroup) {
        existingGroup.entries.push(entry);
      } else {
        groups.set(userKey, {
          user: entry.user,
          entries: [entry],
        });
      }

      return groups;
    }, new Map<string, { user: TimeEntry["user"]; entries: TimeEntry[] }>()),
  )
    .map(([userId, group]) => ({
      userId,
      ...group,
      pendingCount: group.entries.filter((entry) => entry.status === "PENDING")
        .length,
      needsChangesCount: group.entries.filter(
        (entry) => entry.status === "NEEDS_CHANGES",
      ).length,
      approvedCount: group.entries.filter(
        (entry) => entry.status === "APPROVED",
      ).length,
      voidedCount: group.entries.filter((entry) => entry.status === "VOIDED")
        .length,
      manualCount: group.entries.filter((entry) => !entry.shift).length,
      deviationCount: group.entries.filter(
        (entry) => entry.shift && entry.deviation?.hasDeviation,
      ).length,
    }))
    .sort((a, b) => {
      const nameA = `${a.user.firstName} ${a.user.lastName}`.toLowerCase();
      const nameB = `${b.user.firstName} ${b.user.lastName}`.toLowerCase();

      return nameA.localeCompare(nameB, "da-DK");
    });

  function getToken() {
    return localStorage.getItem("token");
  }

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/time-entries`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        setEntries([]);
        return;
      }

      const data = await response.json();

      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtimeCore({
    onTimeEntry: fetchEntries,
  });

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function getHours(entry: TimeEntry) {
    if (!entry.clockOut) return "-";

    const start = new Date(entry.clockIn);
    const end = new Date(entry.clockOut);

    const hours = (end.getTime() - start.getTime()) / 1000 / 60 / 60;

    return hours.toFixed(2);
  }

  async function saveEdit(data: {
    clockIn: string;
    clockOut?: string | null;
    adminNote: string;
  }) {
    if (!editEntry) return;

    try {
      setSavingEdit(true);

      const response = await fetch(`${API_URL}/time-entries/${editEntry.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke redigere timeregistrering",
          ),
        );
      }

      await fetchEntries();
      setEditEntry(null);
      toast.success("Timeregistrering opdateret");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Kunne ikke redigere timeregistrering",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function openHistory(entry: TimeEntry) {
    try {
      setHistoryEntry(entry);
      setHistoryLoading(true);

      const response = await fetch(
        `${API_URL}/time-entries/${entry.id}/revisions`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente historik"),
        );
      }

      const data = await response.json();

      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kunne ikke hente historik",
      );
      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function approve(entry: TimeEntry) {
    try {
      const response = await fetch(
        `${API_URL}/time-entries/${entry.id}/approve`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke godkende timeregistrering",
          ),
        );
      }

      await fetchEntries();

      if (entry.deviation?.hasDeviation) {
        toast.success("Timeregistrering med afvigelse er godkendt");
      } else {
        toast.success("Timeregistrering godkendt");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kunne ikke godkende timeregistrering",
      );
    }
  }

  async function unapprove(id: number) {
    try {
      const response = await fetch(`${API_URL}/time-entries/${id}/unapprove`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kunne ikke fjerne godkendelse"),
        );
      }

      await fetchEntries();
      toast.success("Godkendelse fjernet");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kunne ikke fjerne godkendelse",
      );
    }
  }

  function sendBackForChanges(id: number) {
    inputDialog.prompt({
      title: "Send retur til rettelse",
      description:
        "Skriv hvorfor tidsregistreringen skal rettes. Begrundelsen vises til medarbejderen.",
      label: "Begrundelse",
      placeholder:
        "Fx forkert mødetid, manglende fyraften eller manglende note...",
      confirmText: "Send retur",
      cancelText: "Annuller",
      required: true,
      onConfirm: async (value) => {
        const adminNote = value.trim();

        if (!adminNote) {
          throw new Error("Begrundelse er påkrævet");
        }

        const response = await fetch(`${API_URL}/time-entries/${id}/reject`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            adminNote,
          }),
        });

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Kunne ikke sende timeregistrering retur",
            ),
          );
        }

        await fetchEntries();
        toast.success("Timeregistrering sendt retur til rettelse");
      },
    });
  }

  return (
    <>
      <AdminGuard>
        <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <h1 className="text-3xl font-bold">Godkend timer</h1>

              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Gennemgå, godkend eller send mødetid og fyraften retur til
                rettelse med tydelig sammenligning mellem vagtplan og
                registreret tid.
              </p>
            </div>

            {loading && (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                Henter tidsregistreringer...
              </div>
            )}

            {!loading && entries.length > 0 && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Viser som standard afventende registreringer og
                      registreringer, der er sendt retur til rettelse.
                      <span className="ml-2 font-semibold">
                        Afventer: {pendingCount}
                      </span>
                      <span className="ml-2 font-semibold">
                        Skal rettes: {needsChangesCount}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={showApproved}
                          onChange={(event) =>
                            setShowApproved(event.target.checked)
                          }
                          className="h-4 w-4"
                        />
                        Vis godkendte ({approvedCount})
                      </label>

                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={showVoided}
                          onChange={(event) =>
                            setShowVoided(event.target.checked)
                          }
                          className="h-4 w-4"
                        />
                        Vis annullerede ({voidedCount})
                      </label>
                    </div>
                  </div>
                </div>

                {visibleEntries.length === 0 ? (
                  <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="mb-2 text-4xl">🔎</div>

                    <h2 className="text-xl font-bold">
                      Ingen tidsregistreringer matcher filteret
                    </h2>

                    <p className="mt-2 text-gray-500 dark:text-gray-400">
                      Justér filteret for at se flere registreringer.
                    </p>
                  </div>
                ) : (
                  groupedEntries.map((group) => {
                    const isExpanded = expandedUserIds.includes(group.userId);

                    return (
                      <div
                        key={group.userId}
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
                      >
                        <button
                          type="button"
                          onClick={() => toggleUserGroup(group.userId)}
                          className="flex w-full flex-col gap-4 p-6 text-left transition hover:bg-gray-50 dark:hover:bg-gray-800/60 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h2 className="text-xl font-bold">
                                {group.user.firstName} {group.user.lastName}
                              </h2>

                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                {group.entries.length} registrering
                                {group.entries.length === 1 ? "" : "er"}
                              </span>
                            </div>

                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              {group.user.email}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            {group.pendingCount > 0 && (
                              <span className="rounded-full bg-yellow-100 px-3 py-1 font-semibold text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200">
                                Afventer: {group.pendingCount}
                              </span>
                            )}

                            {group.needsChangesCount > 0 && (
                              <span className="rounded-full bg-red-100 px-3 py-1 font-semibold text-red-800 dark:bg-red-950/40 dark:text-red-200">
                                Skal rettes: {group.needsChangesCount}
                              </span>
                            )}

                            {group.approvedCount > 0 && (
                              <span className="rounded-full bg-green-100 px-3 py-1 font-semibold text-green-800 dark:bg-green-950/40 dark:text-green-200">
                                Godkendte: {group.approvedCount}
                              </span>
                            )}

                            {group.voidedCount > 0 && (
                              <span className="rounded-full bg-gray-100 px-3 py-1 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                Annullerede: {group.voidedCount}
                              </span>
                            )}

                            {group.manualCount > 0 && (
                              <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                                Manuel: {group.manualCount}
                              </span>
                            )}

                            {group.deviationCount > 0 && (
                              <span className="rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                                Afvigelser: {group.deviationCount}
                              </span>
                            )}

                            <span className="ml-1 rounded-xl bg-gray-900 px-3 py-2 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
                              {isExpanded ? "Skjul timer" : "Vis timer"}
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="space-y-4 border-t border-gray-200 p-6 dark:border-gray-800">
                            {group.entries.map((entry) => (
                              <div
                                key={entry.id}
                                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
                              >
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="space-y-4">
                                    <div>
                                      <h3 className="text-lg font-semibold">
                                        {formatDateTime(entry.clockIn)}
                                      </h3>

                                      <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {entry.shift?.workType?.name ||
                                          "Manuel registrering"}
                                      </p>
                                    </div>

                                    <div className="grid gap-2 text-sm">
                                      <div>
                                        <span className="font-semibold">
                                          Arbejdstype:
                                        </span>{" "}
                                        {entry.shift?.workType?.name || "-"}
                                      </div>

                                      <div>
                                        <span className="font-semibold">
                                          Mødt:
                                        </span>
                                        {formatDateTime(entry.clockIn)}
                                      </div>

                                      <div>
                                        <span className="font-semibold">
                                          Gået hjem:
                                        </span>
                                        {formatDateTime(entry.clockOut)}
                                      </div>

                                      <div>
                                        <span className="font-semibold">
                                          Timer:
                                        </span>{" "}
                                        {getHours(entry)}
                                      </div>

                                      <div className="pt-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleEntryDetails(entry.id)
                                          }
                                          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                                            entry.deviation?.hasDeviation ||
                                            entry.clockInNote ||
                                            entry.clockOutNote ||
                                            entry.note ||
                                            entry.adminNote
                                              ? "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-900/50"
                                              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                          }`}
                                        >
                                          {entry.deviation?.hasDeviation ||
                                          entry.clockInNote ||
                                          entry.clockOutNote ||
                                          entry.note ||
                                          entry.adminNote
                                            ? "⚠ Vis detaljer"
                                            : "Vis detaljer"}
                                        </button>
                                      </div>

                                      {expandedEntryIds.includes(entry.id) && (
                                        <>
                                          <DeviationPanel entry={entry} />
                                        </>
                                      )}

                                      {(entry.clockInNote ||
                                        entry.clockOutNote ||
                                        entry.note) && (
                                        <div className="space-y-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
                                          {!entry.shift &&
                                          entry.clockInNote &&
                                          entry.clockInNote ===
                                            entry.clockOutNote ? (
                                            <div>
                                              <span className="font-semibold">
                                                Note:
                                              </span>{" "}
                                              {entry.clockInNote}
                                            </div>
                                          ) : (
                                            <>
                                              {entry.clockInNote && (
                                                <div>
                                                  <span className="font-semibold">
                                                    Mødetidsnote:
                                                  </span>{" "}
                                                  {entry.clockInNote}
                                                </div>
                                              )}

                                              {entry.clockOutNote && (
                                                <div>
                                                  <span className="font-semibold">
                                                    Fyraftensnote:
                                                  </span>{" "}
                                                  {entry.clockOutNote}
                                                </div>
                                              )}
                                            </>
                                          )}

                                          {!entry.clockInNote &&
                                            !entry.clockOutNote &&
                                            entry.note && (
                                              <div>
                                                <span className="font-semibold">
                                                  Medarbejder note:
                                                </span>{" "}
                                                {entry.note}
                                              </div>
                                            )}
                                        </div>
                                      )}

                                      {entry.adminNote && (
                                        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm dark:border-yellow-900 dark:bg-yellow-950/40">
                                          <span className="font-semibold">
                                            Admin note:
                                          </span>{" "}
                                          {entry.adminNote}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-start gap-3 lg:items-end">
                                    <span
                                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                                        entry.status,
                                      )}`}
                                    >
                                      {getStatusLabel(entry.status)}
                                    </span>

                                    {entry.deviation?.hasDeviation && (
                                      <span className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
                                        {entry.shift
                                          ? "Afvigelse"
                                          : "Manuel registrering"}
                                      </span>
                                    )}

                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        onClick={() => setEditEntry(entry)}
                                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                                      >
                                        Redigér
                                      </button>

                                      <button
                                        onClick={() => openHistory(entry)}
                                        className="rounded-xl bg-gray-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                                      >
                                        Historik
                                      </button>

                                      {entry.status === "PENDING" && (
                                        <button
                                          onClick={() => approve(entry)}
                                          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
                                        >
                                          Godkend
                                        </button>
                                      )}

                                      {entry.status === "APPROVED" && (
                                        <button
                                          onClick={() => unapprove(entry.id)}
                                          className="rounded-xl bg-yellow-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-yellow-700"
                                        >
                                          Fjern godkendelse
                                        </button>
                                      )}

                                      {entry.status === "PENDING" && (
                                        <button
                                          onClick={() =>
                                            sendBackForChanges(entry.id)
                                          }
                                          className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                                        >
                                          Send retur
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {!loading && entries.length === 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <div className="mb-2 text-4xl">⏱️</div>

                <h2 className="text-xl font-bold">Ingen tidsregistreringer</h2>

                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Der er ingen registreringer at godkende lige nu.
                </p>
              </div>
            )}
          </div>
        </main>

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

        {historyEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="max-h-[80vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  Historik for tidsregistrering
                </h2>

                <button
                  onClick={() => {
                    setHistoryEntry(null);
                    setHistoryItems([]);
                  }}
                  className="rounded-lg px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  ✕
                </button>
              </div>

              {historyLoading ? (
                <div className="py-8 text-center">Henter historik...</div>
              ) : historyItems.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  Ingen historik fundet
                </div>
              ) : (
                <div className="space-y-4">
                  {historyItems.map((item) => (
                    <div
                      key={item.id}
                      className="relative rounded-xl border border-gray-200 p-4 dark:border-gray-800"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold">
                          {getRevisionActionLabel(item.action)}
                        </div>

                        <div className="text-xs text-gray-500">
                          {formatDateTime(item.createdAt)}
                        </div>
                      </div>

                      {item.changedByUser && (
                        <div className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">
                            {getRevisionActorLabel(item.action)}:
                          </span>{" "}
                          {item.changedByUser.firstName}{" "}
                          {item.changedByUser.lastName}
                        </div>
                      )}

                      <div className="space-y-2 text-sm">
                        {item.previousClockIn !== item.newClockIn && (
                          <div>
                            <span className="font-medium">Mødetid:</span>{" "}
                            {formatDateTime(item.previousClockIn)}
                            {" → "}
                            {formatDateTime(item.newClockIn)}
                          </div>
                        )}

                        {item.previousClockOut !== item.newClockOut && (
                          <div>
                            <span className="font-medium">Fyraften:</span>{" "}
                            {formatDateTime(item.previousClockOut)}
                            {" → "}
                            {formatDateTime(item.newClockOut)}
                          </div>
                        )}

                        {item.previousStatus !== item.newStatus && (
                          <div>
                            <span className="font-medium">Status:</span>{" "}
                            {getStatusHistoryLabel(item.previousStatus)}
                            {" → "}
                            {getStatusHistoryLabel(item.newStatus)}
                          </div>
                        )}

                        {shouldShowCreatedNoteAsSingleNote(item) ? (
                          <div>
                            <span className="font-medium">Note:</span>{" "}
                            {item.newClockInNote}
                          </div>
                        ) : (
                          <>
                            {item.previousClockInNote !==
                              item.newClockInNote && (
                              <div>
                                <span className="font-medium">
                                  Mødetidsnote:
                                </span>{" "}
                                {item.previousClockInNote || "-"}
                                {" → "}
                                {item.newClockInNote || "-"}
                              </div>
                            )}

                            {item.previousClockOutNote !==
                              item.newClockOutNote && (
                              <div>
                                <span className="font-medium">
                                  Fyraftensnote:
                                </span>{" "}
                                {item.previousClockOutNote || "-"}
                                {" → "}
                                {item.newClockOutNote || "-"}
                              </div>
                            )}
                          </>
                        )}

                        {item.previousAdminNote !== item.newAdminNote && (
                          <div>
                            <span className="font-medium">Adminnote:</span>{" "}
                            {item.previousAdminNote || "-"}
                            {" → "}
                            {item.newAdminNote || "-"}
                          </div>
                        )}
                      </div>

                      {item.reason &&
                        item.reason !== "Tidsregistrering oprettet" &&
                        item.reason !== item.newAdminNote && (
                          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm dark:bg-gray-800">
                            <div className="mb-1 font-medium">
                              {item.action === "APPROVED" ||
                              item.action === "UNAPPROVED"
                                ? "Systembesked"
                                : "Begrundelse"}
                            </div>

                            <div>{item.reason}</div>
                          </div>
                        )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminGuard>

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
