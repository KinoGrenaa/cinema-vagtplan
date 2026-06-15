"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import TimeEntryHistoryModal from "@/app/components/time-entries/TimeEntryHistoryModal";

type TimeEntryStatus = "PENDING" | "NEEDS_CHANGES" | "APPROVED" | "VOIDED";

type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
  status: TimeEntryStatus;
  note?: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  adminNote?: string | null;
  payrollType?: {
    name: string;
  } | null;
  shift?: {
    workType?: {
      name: string;
    } | null;
  } | null;
};

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

function getStatusLabel(status: TimeEntryStatus) {
  if (status === "APPROVED") return "Godkendt";
  if (status === "NEEDS_CHANGES") return "Skal rettes";
  if (status === "VOIDED") return "Annulleret";
  return "Afventer";
}

function getStatusClass(status: TimeEntryStatus) {
  if (status === "APPROVED") {
    return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
  }

  if (status === "NEEDS_CHANGES") {
    return "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200";
  }

  if (status === "VOIDED") {
    return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }

  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
}

function getRevisionActionLabel(action: string) {
  switch (action) {
    case "CREATED":
      return "Oprettet";

    case "UPDATED":
      return "Rettet";

    case "APPROVED":
      return "Godkendt";

    case "NEEDS_CHANGES":
      return "Sendt retur til rettelse";

    case "VOIDED":
      return "Annulleret";

    case "REOPENED":
      return "Genåbnet";

    case "UNAPPROVED":
      return "Godkendelse fjernet";

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

    case "NEEDS_CHANGES":
      return "Sendt retur af";

    case "VOIDED":
      return "Annulleret af";

    case "REOPENED":
      return "Genåbnet af";

    case "UNAPPROVED":
      return "Godkendelse fjernet af";

    default:
      return "Udført af";
  }
}

function shouldShowCreatedNoteAsSingleNote(item: TimeEntryRevision) {
  if (item.action !== "CREATED") return false;

  const clockInNote = item.newClockInNote?.trim() || "";
  const clockOutNote = item.newClockOutNote?.trim() || "";

  return clockInNote.length > 0 && clockInNote === clockOutNote;
}

function shouldShowEntryNoteAsSingleNote(entry: TimeEntry) {
  const clockInNote = entry.clockInNote?.trim() || "";
  const clockOutNote = entry.clockOutNote?.trim() || "";

  return !entry.shift && clockInNote.length > 0 && clockInNote === clockOutNote;
}

function getEntrySingleNote(entry: TimeEntry) {
  return (
    entry.note?.trim() ||
    entry.clockInNote?.trim() ||
    entry.clockOutNote?.trim() ||
    ""
  );
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

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Date(`${value}T00:00:00`).toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getEntryHoursNumber(entry: TimeEntry) {
  if (!entry.clockOut) return 0;

  const start = new Date(entry.clockIn).getTime();
  const end = new Date(entry.clockOut).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }

  return (end - start) / 1000 / 60 / 60;
}

function getHours(entry: TimeEntry) {
  const hours = getEntryHoursNumber(entry);

  if (hours <= 0) return "-";

  return `${hours.toFixed(2)} t`;
}

function dateToLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getDaySummaryParts(entries: TimeEntry[]) {
  const approvedHours = entries.reduce((total, entry) => {
    if (entry.status !== "APPROVED") return total;
    return total + getEntryHoursNumber(entry);
  }, 0);

  const pendingHours = entries.reduce((total, entry) => {
    if (entry.status !== "PENDING") return total;
    return total + getEntryHoursNumber(entry);
  }, 0);

  const needsChangesCount = entries.filter(
    (entry) => entry.status === "NEEDS_CHANGES",
  ).length;

  const voidedCount = entries.filter(
    (entry) => entry.status === "VOIDED",
  ).length;

  return [
    approvedHours > 0 ? `Godkendt: ${approvedHours.toFixed(2)} t` : null,
    pendingHours > 0 ? `Afventer: ${pendingHours.toFixed(2)} t` : null,
    needsChangesCount > 0 ? `Kræver handling: ${needsChangesCount}` : null,
    voidedCount > 0 ? `Annulleret: ${voidedCount}` : null,
  ].filter(Boolean) as string[];
}

function isInPayrollPeriod(
  entry: TimeEntry,
  startDate: string,
  endDate: string,
) {
  const entryDate = dateToLocalDateString(new Date(entry.clockIn));
  return entryDate >= startDate && entryDate <= endDate;
}

function getEntryDayKey(entry: TimeEntry) {
  return dateToLocalDateString(new Date(entry.clockIn));
}

function getEntryDayLabel(dayKey: string) {
  return new Date(`${dayKey}T00:00:00`).toLocaleDateString("da-DK", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function toInputDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

export default function MyTimePage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [payrollPeriod, setPayrollPeriod] = useState(() => {
    const today = dateToLocalDateString(new Date());

    return {
      startDate: today,
      endDate: today,
    };
  });
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState("");
  const [editClockOut, setEditClockOut] = useState("");
  const [editClockInNote, setEditClockInNote] = useState("");
  const [editClockOutNote, setEditClockOutNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [showVoidedEntries, setShowVoidedEntries] = useState(false);
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
        toast.error("Kunne ikke hente dine timer");
        return;
      }

      const data = await response.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setEntries([]);
      toast.error("Kunne ikke hente dine timer");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPayrollPeriodForDate = useCallback(
    async (referenceDate: string) => {
      try {
        const response = await apiFetch(
          `/payroll/period-for-date?date=${encodeURIComponent(referenceDate)}`,
        );

        if (!response.ok) {
          toast.error("Kunne ikke hente lønperiode");
          return;
        }

        const data = await response.json();

        if (
          typeof data?.startDate !== "string" ||
          typeof data?.endDate !== "string"
        ) {
          toast.error("Ugyldig lønperiode fra serveren");
          return;
        }

        setPayrollPeriod({
          startDate: data.startDate.slice(0, 10),
          endDate: data.endDate.slice(0, 10),
        });

        setExpandedDayKeys([]);
      } catch (error) {
        console.error(error);
        toast.error("Kunne ikke hente lønperiode");
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
      toast.error("Ugyldig mødetid");
      return;
    }

    if (parsedClockOut && Number.isNaN(parsedClockOut.getTime())) {
      toast.error("Ugyldig fyraften");
      return;
    }

    if (parsedClockOut && parsedClockOut <= parsedClockIn) {
      toast.error("Fyraften skal være efter mødetid");
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
        toast.error(getErrorMessage(errorText));
        return;
      }

      await fetchEntries();
      closeEdit();
      toast.success("Timeregistrering rettet");
    } catch (error) {
      console.error(error);
      toast.error("Kunne ikke rette timeregistrering");
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
        toast.error("Kunne ikke hente historik");
        setHistoryEntry(null);
        return;
      }

      const data = await response.json();

      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Kunne ikke hente historik");
      setHistoryEntry(null);
    } finally {
      setHistoryLoading(false);
    }
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
    return filteredEntries.filter(
      (entry) => showVoidedEntries || entry.status !== "VOIDED",
    );
  }, [filteredEntries, showVoidedEntries]);

  const approvedHours = useMemo(() => {
    return filteredEntries.reduce((total, entry) => {
      if (entry.status !== "APPROVED") return total;
      return total + getEntryHoursNumber(entry);
    }, 0);
  }, [filteredEntries]);

  const pendingHours = useMemo(() => {
    return filteredEntries.reduce((total, entry) => {
      if (entry.status !== "PENDING") return total;
      return total + getEntryHoursNumber(entry);
    }, 0);
  }, [filteredEntries]);

  const needsChangesCount = useMemo(() => {
    return filteredEntries.filter((entry) => entry.status === "NEEDS_CHANGES")
      .length;
  }, [filteredEntries]);

  const dayGroups = useMemo(() => {
    type DayGroup = {
      dayKey: string;
      label: string;
      entries: TimeEntry[];
      summaryParts: string[];
    };

    return Array.from(
      visibleEntries.reduce((groups, entry) => {
        const dayKey = getEntryDayKey(entry);
        const existingGroup = groups.get(dayKey);

        if (existingGroup) {
          existingGroup.entries.push(entry);
          return groups;
        }

        groups.set(dayKey, {
          dayKey,
          label: getEntryDayLabel(dayKey),
          entries: [entry],
          summaryParts: [],
        });

        return groups;
      }, new Map<string, DayGroup>()),
    )
      .map(([, group]) => ({
        ...group,
        summaryParts: getDaySummaryParts(group.entries),
      }))
      .sort((a, b) => b.dayKey.localeCompare(a.dayKey));
  }, [visibleEntries]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mine timer</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Se dine indberettede og godkendte timer.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-1 text-sm font-medium">Lønperiode</div>
          <div className="text-base font-semibold">
            {formatDate(payrollPeriod.startDate)} →{" "}
            {formatDate(payrollPeriod.endDate)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={goToPreviousPayrollPeriod}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Forrige
            </button>

            <button
              type="button"
              onClick={goToCurrentPayrollPeriod}
              className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
            >
              Aktuel
            </button>

            <button
              type="button"
              onClick={goToNextPayrollPeriod}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Næste
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Beregnet ud fra biografens lønopsætning.
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Godkendte timer
          </div>
          <div className="mt-1 text-2xl font-bold">
            {approvedHours.toFixed(2)} t
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Tæller med i løngrundlaget.
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Afventer godkendelse
          </div>
          <div className="mt-1 text-2xl font-bold">
            {pendingHours.toFixed(2)} t
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Ikke med i løn før godkendelse.
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Kræver handling
          </div>
          <div className="mt-1 text-2xl font-bold">{needsChangesCount}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Registreringer sendt retur til rettelse.
          </div>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <input
            type="checkbox"
            checked={showVoidedEntries}
            onChange={(event) => setShowVoidedEntries(event.target.checked)}
            className="h-4 w-4"
          />
          Vis annullerede
        </label>
      </div>

      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Henter timer...
        </div>
      )}

      {!loading && visibleEntries.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Der er ingen timer i den aktuelle lønperiode.
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
                          } else if (part.startsWith("Annulleret:")) {
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
                            <span className="font-semibold">Clock ind:</span>{" "}
                            {formatDateTime(entry.clockIn)}
                          </div>

                          <div>
                            <span className="font-semibold">Clock ud:</span>{" "}
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
                                    ? "Sendt retur til rettelse"
                                    : entry.status === "VOIDED"
                                      ? "Annulleret"
                                      : "Admin note"}
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

      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4">
              <h2 className="text-xl font-bold">Redigér timeregistrering</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Du kan kun rette timer, der ikke er godkendt endnu.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Clock ind
                </label>
                <input
                  type="datetime-local"
                  value={editClockIn}
                  onChange={(event) => setEditClockIn(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Clock ud
                </label>
                <input
                  type="datetime-local"
                  value={editClockOut}
                  onChange={(event) => setEditClockOut(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Mødetidsnote
                </label>
                <textarea
                  value={editClockInNote}
                  onChange={(event) => setEditClockInNote(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  placeholder="Forklar evt. ændret mødetid"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Fyraftensnote
                </label>
                <textarea
                  value={editClockOutNote}
                  onChange={(event) => setEditClockOutNote(event.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  placeholder="Forklar evt. ændret fyraften"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={closeEdit}
                disabled={savingEdit}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Annuller
              </button>

              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {savingEdit ? "Gemmer..." : "Gem ændringer"}
              </button>
            </div>
          </div>
        </div>
      )}
      <TimeEntryHistoryModal
        isOpen={!!historyEntry}
        onClose={() => {
          setHistoryEntry(null);
          setHistoryItems([]);
        }}
        revisions={historyItems}
        currentStatus={historyEntry?.status}
      />
    </main>
  );
}
