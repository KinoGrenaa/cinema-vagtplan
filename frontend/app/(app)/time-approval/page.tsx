"use client";

import { useCallback, useEffect, useState } from "react";

import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import InputModal from "@/app/components/modals/InputModal";
import TimeEntryEditModal from "@/app/components/modals/TimeEntryEditModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import { toast } from "sonner";
import { formatDateTime, readErrorMessage } from "./utils";
import type { TimeEntry, TimeEntryStatus } from "./types";
import TimeApprovalFilterModal from "./components/TimeApprovalFilterModal";
import DeviationPanel from "./components/DeviationPanel";
import PayrollAdjustmentConfirmationModal, {
  type PayrollAdjustmentConfirmation,
  type PayrollApprovalConflict,
  type PayrollPeriodInfo,
} from "./components/PayrollAdjustmentConfirmationModal";
import TimeEntryHistoryModal from "@/app/components/time-entries/TimeEntryHistoryModal";
import TimeApprovalToolbar from "./components/TimeApprovalToolbar";
import TimeApprovalEntryNotes from "./components/TimeApprovalEntryNotes";
import TimeApprovalEntryActions from "./components/TimeApprovalEntryActions";
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

  function getSelectedCinemaQuery() {
    const selectedCinemaId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("masterSelectedCinemaId")
        : null;

    return selectedCinemaId
      ? `?cinemaId=${encodeURIComponent(selectedCinemaId)}`
      : "";
  }

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiFetch(
        `/time-entries${getSelectedCinemaQuery()}`,
      );

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

          const response = await apiFetch(
            `/time-entries/${editEntry.id}${getSelectedCinemaQuery()}`,
            {
              method: "PATCH",
              body: JSON.stringify(data),
            },
          );

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

      const response = await apiFetch(
        `/time-entries/${entry.id}/revisions${getSelectedCinemaQuery()}`,
      );

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

  async function approve(
    entry: TimeEntry,
    options?: { confirmPayrollAdjustment?: boolean },
  ) {
    try {
      const response = await apiFetch(
        `/time-entries/${entry.id}/approve${getSelectedCinemaQuery()}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            confirmPayrollAdjustment:
              options?.confirmPayrollAdjustment ?? false,
          }),
        },
      );

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

  async function confirmPayrollAdjustmentApproval() {
    if (!payrollAdjustmentConfirmation) return;

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
  }

  async function unapprove(id: number) {
    try {
      const response = await apiFetch(
        `/time-entries/${id}/unapprove${getSelectedCinemaQuery()}`,
        {
          method: "PATCH",
        },
      );

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
          const response = await apiFetch(
            `/time-entries/${id}/reject${getSelectedCinemaQuery()}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                adminNote,
              }),
            },
          );

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
          const response = await apiFetch(
            `/time-entries/${id}/void${getSelectedCinemaQuery()}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                adminNote,
              }),
            },
          );

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
                <TimeApprovalToolbar
                  activeFilterCount={activeFilterCount}
                  employeeSearch={employeeSearch}
                  pendingCount={pendingCount}
                  needsChangesCount={needsChangesCount}
                  onEmployeeSearchChange={setEmployeeSearch}
                  onOpenFilters={() => setShowFilterModal(true)}
                  onResetFilters={resetFilters}
                />

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

                                      <TimeApprovalEntryNotes entry={entry} />
                                    </div>
                                  </div>

                                  <TimeApprovalEntryActions
                                    entry={entry}
                                    onEdit={setEditEntry}
                                    onOpenHistory={openHistory}
                                    onApprove={approve}
                                    onUnapprove={unapprove}
                                    onSendBackForChanges={sendBackForChanges}
                                    onVoid={voidEntry}
                                  />
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
