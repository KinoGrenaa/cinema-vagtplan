"use client";

import { useCallback, useEffect, useState } from "react";

import AdminGuard from "@/app/components/AdminGuard";
import FilterModal from "@/app/components/modals/FilterModal";
import InfoModal from "@/app/components/modals/InfoModal";
import InputModal from "@/app/components/modals/InputModal";
import TimeEntryEditModal from "@/app/components/modals/TimeEntryEditModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import { toast } from "sonner";
import {
  formatDateTime,
  formatMinutes,
  getStatusClass,
  getStatusLabel,
  readErrorMessage,
} from "./utils";
import type { TimeEntry, TimeEntryStatus } from "./types";
import TimeEntryHistoryModal from "@/app/components/time-entries/TimeEntryHistoryModal";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import { useConfirm } from "@/app/hooks/useConfirm";

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

type PayrollPeriodInfo = {
  id: number;
  startDate: string;
  endDate: string;
};

type PayrollApprovalConflict = {
  code?: string;
  title?: string;
  message?: string;
  originalPayrollPeriod?: PayrollPeriodInfo | null;
  adjustmentPayrollPeriod?: PayrollPeriodInfo | null;
};

type PayrollAdjustmentConfirmation = {
  entry: TimeEntry;
  details: PayrollApprovalConflict;
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

function hasEntryNote(entry: TimeEntry) {
  return Boolean(
    entry.clockInNote?.trim() ||
    entry.clockOutNote?.trim() ||
    entry.note?.trim() ||
    entry.adminNote?.trim(),
  );
}

function getEntryLocalDate(entry: TimeEntry) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Copenhagen",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(entry.clockIn));
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
  const infoDialog = useInfoModal();
  const errorDialog = useConfirm();
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [historyItems, setHistoryItems] = useState<TimeEntryRevision[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<TimeEntry | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [showPending, setShowPending] = useState(true);
  const [showNeedsChanges, setShowNeedsChanges] = useState(true);
  const [showApproved, setShowApproved] = useState(false);
  const [showVoided, setShowVoided] = useState(false);
  const [showPlannedEntries, setShowPlannedEntries] = useState(true);
  const [showManualEntries, setShowManualEntries] = useState(true);
  const [onlyWithDeviations, setOnlyWithDeviations] = useState(false);
  const [onlyWithNotes, setOnlyWithNotes] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedEntryIds, setExpandedEntryIds] = useState<number[]>([]);
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
  const [payrollAdjustmentConfirmation, setPayrollAdjustmentConfirmation] =
    useState<PayrollAdjustmentConfirmation | null>(null);
  const [confirmingPayrollAdjustment, setConfirmingPayrollAdjustment] =
    useState(false);

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

  const formatSignedMinutesAsTime = (minutesValue: number) => {
    const sign = minutesValue >= 0 ? "+" : "-";
    const absoluteMinutes = Math.abs(minutesValue);
    const hours = Math.floor(absoluteMinutes / 60);
    const minutes = absoluteMinutes % 60;

    return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}`;
  };

  const visibleEntries = entries.filter((entry) => {
    if (!entry.clockIn || !entry.clockOut) return false;

    if (entry.status === "PENDING" && !showPending) return false;
    if (entry.status === "NEEDS_CHANGES" && !showNeedsChanges) return false;
    if (entry.status === "APPROVED" && !showApproved) return false;
    if (entry.status === "VOIDED" && !showVoided) return false;

    const isManualEntry = !entry.shift;

    if (isManualEntry && !showManualEntries) return false;
    if (!isManualEntry && !showPlannedEntries) return false;

    if (onlyWithDeviations && !entry.deviation?.hasDeviation) return false;
    if (onlyWithNotes && !hasEntryNote(entry)) return false;

    const entryDate = getEntryLocalDate(entry);

    if (dateFrom && entryDate < dateFrom) return false;
    if (dateTo && entryDate > dateTo) return false;

    const search = employeeSearch.trim().toLowerCase();

    if (search) {
      const haystack =
        `${entry.user.firstName} ${entry.user.lastName} ${entry.user.email}`.toLowerCase();

      if (!haystack.includes(search)) return false;
    }

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

  const activeFilterCount = [
    !showPending,
    !showNeedsChanges,
    showApproved,
    showVoided,
    !showPlannedEntries,
    !showManualEntries,
    onlyWithDeviations,
    onlyWithNotes,
    Boolean(dateFrom),
    Boolean(dateTo),
  ].filter(Boolean).length;

  function resetFilters() {
    setShowPending(true);
    setShowNeedsChanges(true);
    setShowApproved(false);
    setShowVoided(false);
    setShowPlannedEntries(true);
    setShowManualEntries(true);
    setOnlyWithDeviations(false);
    setOnlyWithNotes(false);
    setDateFrom("");
    setDateTo("");
  }

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

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiFetch("/time-entries");

      if (!response.ok) {
        if (response.status !== 401) {
          const message = await readErrorMessage(
            response,
            "Kunne ikke hente tidsregistreringer",
          );

          infoDialog.showError("Kunne ikke hente tidsregistreringer", message);
        }

        setEntries([]);
        return;
      }

      const data = await response.json();
      const nextEntries = Array.isArray(data) ? data : [];
      setEntries(nextEntries);
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke hente tidsregistreringer",
        error instanceof Error && error.message
          ? error.message
          : "Der opstod en fejl, da tidsregistreringerne skulle hentes. Prøv igen.",
      );

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

    const hasChanges =
      data.clockIn !== editEntry.clockIn ||
      (data.clockOut ?? null) !== (editEntry.clockOut ?? null);

    if (!hasChanges) {
      errorDialog.confirm({
        title: "Ingen ændringer",
        description:
          "Der er ikke foretaget nogen ændringer i tidsregistreringen.",
        confirmText: "OK",
        onConfirm: async () => {},
      });

      return;
    }

    const employeeName = `${editEntry.user.firstName} ${editEntry.user.lastName}`;
    const oldTime = `${formatDateTime(editEntry.clockIn)} - ${
      editEntry.clockOut ? formatDateTime(editEntry.clockOut) : "-"
    }`;
    const newTime = `${formatDateTime(data.clockIn)} - ${
      data.clockOut ? formatDateTime(data.clockOut) : "-"
    }`;

    errorDialog.confirm({
      title: "Bekræft rettelse",
      description: [
        "Du er ved at rette en tidsregistrering.",
        "",
        `Medarbejder:`,
        employeeName,
        "",
        `Tidligere registrering:`,
        oldTime,
        "",
        `Ny registrering:`,
        newTime,
        "",
        "Ændringen gemmes i historikken.",
        "",
        "Hvis registreringen allerede indgår i en eksporteret lønperiode, opretter systemet automatisk en efterregulering.",
      ].join("\n"),
      confirmText: "Gem rettelse",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        try {
          setSavingEdit(true);

          const response = await apiFetch(`/time-entries/${editEntry.id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            if (response.status === 401) return;

            const message = await readErrorMessage(
              response,
              "Kunne ikke redigere timeregistrering",
            );

            infoDialog.showError("Kunne ikke gemme rettelsen", message);

            return;
          }

          await fetchEntries();
          setEditEntry(null);
          toast.success("Timeregistrering opdateret");
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke gemme rettelsen",
            error instanceof Error && error.message
              ? error.message
              : "Der opstod en fejl, da rettelsen skulle gemmes. Prøv igen.",
          );
        } finally {
          setSavingEdit(false);
        }
      },
    });
  }

  async function openHistory(entry: TimeEntry) {
    try {
      setHistoryEntry(entry);
      setHistoryLoading(true);

      const response = await apiFetch(`/time-entries/${entry.id}/revisions`);

      if (!response.ok) {
        if (response.status === 401) {
          setHistoryItems([]);
          return;
        }

        throw new Error(
          await readErrorMessage(response, "Kunne ikke hente historik"),
        );
      }

      const data = await response.json();

      setHistoryItems(Array.isArray(data) ? data : []);
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke hente historik",
        error instanceof Error ? error.message : "Kunne ikke hente historik",
      );

      setHistoryItems([]);
    } finally {
      setHistoryLoading(false);
    }
  }

  function getPayrollConflictDetails(
    payload: unknown,
  ): PayrollApprovalConflict {
    if (!payload || typeof payload !== "object") return {};

    const data = payload as {
      code?: string;
      title?: string;
      message?: string | PayrollApprovalConflict;
      originalPayrollPeriod?: PayrollPeriodInfo | null;
      adjustmentPayrollPeriod?: PayrollPeriodInfo | null;
    };

    if (data.message && typeof data.message === "object") {
      return data.message;
    }

    return {
      code: data.code,
      title: data.title,
      message: typeof data.message === "string" ? data.message : undefined,
      originalPayrollPeriod: data.originalPayrollPeriod,
      adjustmentPayrollPeriod: data.adjustmentPayrollPeriod,
    };
  }

  function formatPayrollPeriod(period?: PayrollPeriodInfo | null) {
    if (!period) return "-";

    return `${formatDateTime(period.startDate)} – ${formatDateTime(
      period.endDate,
    )}`;
  }

  async function approve(
    entry: TimeEntry,
    options?: { confirmPayrollAdjustment?: boolean },
  ) {
    try {
      const response = await apiFetch(`/time-entries/${entry.id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({
          confirmPayrollAdjustment: options?.confirmPayrollAdjustment ?? false,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) return;

        if (response.status === 409) {
          const payload = await response.json().catch(() => null);
          const details = getPayrollConflictDetails(payload);

          if (details.code === "PAYROLL_PERIOD_LOCKED") {
            infoDialog.showError(
              "Lønperioden er låst",
              details.message ||
                "Lås lønperioden op før tidsregistreringen kan godkendes.",
            );

            return;
          }

          if (details.code === "PAYROLL_PERIOD_EXPORTED") {
            setPayrollAdjustmentConfirmation({
              entry,
              details,
            });
            return;
          }
        }

        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke godkende timeregistrering",
          ),
        );
      }

      await fetchEntries();

      if (options?.confirmPayrollAdjustment) {
        toast.success("Timeregistrering godkendt som efterregulering");
      } else if (entry.deviation?.hasDeviation) {
        toast.success("Timeregistrering med afvigelse er godkendt");
      } else {
        toast.success("Timeregistrering godkendt");
      }
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke godkende timeregistrering",
        error instanceof Error
          ? error.message
          : "Kunne ikke godkende timeregistrering",
      );
    }
  }

  async function unapprove(id: number) {
    try {
      const response = await apiFetch(`/time-entries/${id}/unapprove`, {
        method: "PATCH",
      });

      if (!response.ok) {
        if (response.status === 401) return;

        throw new Error(
          await readErrorMessage(response, "Kunne ikke fjerne godkendelse"),
        );
      }

      await fetchEntries();
      toast.success("Godkendelse fjernet");
    } catch (error) {
      infoDialog.showError(
        "Kunne ikke fjerne godkendelse",
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
        "Skriv hvorfor tidsregistreringen skal rettes. Beskeden vises til medarbejderen.",
      label: "Besked til medarbejderen",
      placeholder:
        "Fx forkert mødetid, manglende fyraften eller manglende note...",
      confirmText: "Send retur",
      cancelText: "Annuller",
      required: true,
      onConfirm: async (value) => {
        const adminNote = value.trim();

        if (!adminNote) {
          infoDialog.showError(
            "Besked mangler",
            "Du skal skrive en besked til medarbejderen.",
          );

          return;
        }

        try {
          const response = await apiFetch(`/time-entries/${id}/reject`, {
            method: "PATCH",
            body: JSON.stringify({
              adminNote,
            }),
          });

          if (!response.ok) {
            if (response.status === 401) return;

            const message = await readErrorMessage(
              response,
              "Kunne ikke sende timeregistrering retur",
            );

            infoDialog.showError("Kan ikke sendes retur", message);

            return;
          }

          await fetchEntries();
          toast.success("Timeregistrering sendt retur til rettelse");
        } catch (error) {
          infoDialog.showError(
            "Kan ikke sendes retur",
            error instanceof Error && error.message
              ? error.message
              : "Der opstod en fejl, da timeregistreringen skulle sendes retur. Prøv igen.",
          );
        }
      },
    });
  }

  function voidEntry(id: number) {
    inputDialog.prompt({
      title: "Afvis registrering",
      description:
        "Denne tidsregistrering markeres som afvist og kommer ikke med i løn. Den slettes ikke fra historikken.",
      label: "Intern note",
      placeholder:
        "Fx fejlregistrering, dobbeltregistrering eller registrering der ikke skal lønbehandles...",
      confirmText: "Afvis registrering",
      cancelText: "Annuller",
      required: true,
      onConfirm: async (value) => {
        const adminNote = value.trim();

        if (!adminNote) {
          infoDialog.showError(
            "Intern note mangler",
            "Du skal skrive en intern note for annulleringen.",
          );

          return;
        }

        try {
          const response = await apiFetch(`/time-entries/${id}/void`, {
            method: "PATCH",
            body: JSON.stringify({
              adminNote,
            }),
          });

          if (!response.ok) {
            if (response.status === 401) return;

            const message = await readErrorMessage(
              response,
              "Kunne ikke annullere tidsregistrering",
            );

            infoDialog.showError(
              "Kunne ikke annullere tidsregistrering",
              message,
            );

            return;
          }

          await fetchEntries();
          toast.success("Tidsregistrering annulleret");
        } catch (error) {
          infoDialog.showError(
            "Kunne ikke annullere tidsregistrering",
            error instanceof Error && error.message
              ? error.message
              : "Der opstod en fejl, da tidsregistreringen skulle annulleres. Prøv igen.",
          );
        }
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

            {!loading && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex-1 space-y-3">
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

                      <label className="block max-w-xl text-sm font-medium text-gray-700 dark:text-gray-200">
                        Søg medarbejder
                        <input
                          type="search"
                          value={employeeSearch}
                          onChange={(event) =>
                            setEmployeeSearch(event.target.value)
                          }
                          placeholder="Søg på navn eller e-mail..."
                          className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          Nulstil filtre
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setShowFilterModal(true)}
                        className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                      >
                        Filtre
                        {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
                      </button>
                    </div>
                  </div>
                </div>

                {entries.length > 0 && visibleEntries.length === 0 ? (
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

                                    {entry.payrollAdjustments &&
                                      entry.payrollAdjustments.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {entry.payrollAdjustments.map(
                                            (adjustment) => (
                                              <span
                                                key={adjustment.id}
                                                className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                              >
                                                Efterregulering{" "}
                                                {formatSignedMinutesAsTime(
                                                  adjustment.minutesDelta,
                                                )}
                                              </span>
                                            ),
                                          )}
                                        </div>
                                      )}

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
                                        </span>{" "}
                                        {formatDateTime(entry.clockIn)}
                                      </div>

                                      <div>
                                        <span className="font-semibold">
                                          Gået hjem:
                                        </span>{" "}
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
                                      {entry.status !== "VOIDED" && (
                                        <button
                                          onClick={() => voidEntry(entry.id)}
                                          className="rounded-xl bg-red-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-900"
                                        >
                                          Afvis registrering
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

            {!loading &&
              entries.length === 0 &&
              activeFilterCount === 0 &&
              !employeeSearch.trim() && (
                <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-2 text-4xl">⏱️</div>

                  <h2 className="text-xl font-bold">
                    Ingen tidsregistreringer
                  </h2>

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

        <FilterModal
          open={showFilterModal}
          title="Filtre"
          activeFilterCount={activeFilterCount}
          onApply={() => setShowFilterModal(false)}
          onClose={() => setShowFilterModal(false)}
          onReset={resetFilters}
        >
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Status
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
                  <input
                    type="checkbox"
                    checked={showPending}
                    onChange={(event) => setShowPending(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Afventer godkendelse ({pendingCount})
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
                  <input
                    type="checkbox"
                    checked={showNeedsChanges}
                    onChange={(event) =>
                      setShowNeedsChanges(event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Sendt retur ({needsChangesCount})
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
                  <input
                    type="checkbox"
                    checked={showApproved}
                    onChange={(event) => setShowApproved(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Godkendte ({approvedCount})
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
                  <input
                    type="checkbox"
                    checked={showVoided}
                    onChange={(event) => setShowVoided(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Annullerede ({voidedCount})
                </label>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Registreringstype
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
                  <input
                    type="checkbox"
                    checked={showPlannedEntries}
                    onChange={(event) =>
                      setShowPlannedEntries(event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Planlagte vagter
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
                  <input
                    type="checkbox"
                    checked={showManualEntries}
                    onChange={(event) =>
                      setShowManualEntries(event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Manuelle registreringer
                </label>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Indhold
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
                  <input
                    type="checkbox"
                    checked={onlyWithDeviations}
                    onChange={(event) =>
                      setOnlyWithDeviations(event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  Kun registreringer med afvigelser
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-800">
                  <input
                    type="checkbox"
                    checked={onlyWithNotes}
                    onChange={(event) => setOnlyWithNotes(event.target.checked)}
                    className="h-4 w-4"
                  />
                  Kun registreringer med noter
                </label>
              </div>
            </section>

            <section>
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Dato
              </h3>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Fra
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(event) => setDateFrom(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                  />
                </label>

                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Til
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(event) => setDateTo(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                  />
                </label>
              </div>
            </section>
          </div>
        </FilterModal>
      </AdminGuard>

      <TimeEntryHistoryModal
        isOpen={!!historyEntry}
        onClose={() => {
          setHistoryEntry(null);
          setHistoryItems([]);
        }}
        revisions={historyItems}
        currentStatus={historyEntry?.status}
      />

      {payrollAdjustmentConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <h2 className="text-xl font-bold">
              Lønperioden er allerede eksporteret
            </h2>

            <div className="mt-4 space-y-4 text-sm text-gray-700 dark:text-gray-200">
              <p>
                Denne tidsregistrering tilhører en lønperiode, der allerede er
                eksporteret.
              </p>

              <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-800">
                <div className="font-semibold">Oprindelig lønperiode</div>
                <div>
                  {formatPayrollPeriod(
                    payrollAdjustmentConfirmation.details.originalPayrollPeriod,
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-orange-50 p-3 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
                <div className="font-semibold">
                  Efterreguleres i lønperioden
                </div>
                <div>
                  {formatPayrollPeriod(
                    payrollAdjustmentConfirmation.details
                      .adjustmentPayrollPeriod,
                  )}
                </div>
              </div>

              <p>
                Hvis du fortsætter, bliver registreringen markeret som
                efterregulering.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={confirmingPayrollAdjustment}
                onClick={() => setPayrollAdjustmentConfirmation(null)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Annuller
              </button>

              <button
                type="button"
                disabled={confirmingPayrollAdjustment}
                onClick={async () => {
                  const entry = payrollAdjustmentConfirmation.entry;

                  try {
                    setConfirmingPayrollAdjustment(true);

                    await approve(entry, {
                      confirmPayrollAdjustment: true,
                    });

                    setPayrollAdjustmentConfirmation(null);
                  } finally {
                    setConfirmingPayrollAdjustment(false);
                  }
                }}
                className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                {confirmingPayrollAdjustment
                  ? "Godkender..."
                  : "Godkend som efterregulering"}
              </button>
            </div>
          </div>
        </div>
      )}

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
