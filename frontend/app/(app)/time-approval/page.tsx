"use client";

import { useCallback, useEffect, useState } from "react";

import AdminGuard from "@/app/components/AdminGuard";
import AuditHistoryModal from "@/app/components/modals/AuditHistoryModal";
import InputModal from "@/app/components/modals/InputModal";
import TimeEntryEditModal from "@/app/components/modals/TimeEntryEditModal";
import { useInputModal } from "@/app/hooks/useInputModal";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { toast } from "sonner";

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type TimeEntryStatus = "PENDING" | "APPROVED" | "REJECTED";

type AuditLog = {
  id: number;
  action: string;
  description?: string | null;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
  } | null;
};

type TimeEntryDeviation = {
  hasDeviation: boolean;
  requiresNote: boolean;

  types: string[];

  plannedMinutes: number | null;
  registeredMinutes: number | null;
  differenceMinutes: number | null;

  clockInDeviationMinutes: number | null;
  clockOutDeviationMinutes: number | null;

  messages: string[];
};

type TimeEntry = {
  id: number;
  clockIn: string;
  clockOut?: string | null;
  status: TimeEntryStatus;

  note?: string | null;
  clockInNote?: string | null;
  clockOutNote?: string | null;
  adminNote?: string | null;

  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  shift?: {
    startTime?: string;
    endTime?: string;
    workType?: {
      name: string;
    };
  } | null;
  deviation?: TimeEntryDeviation;
};

function getStatusLabel(status: TimeEntryStatus) {
  if (status === "APPROVED") return "Godkendt";
  if (status === "REJECTED") return "Afvist";
  return "Afventer";
}

function getStatusClass(status: TimeEntryStatus) {
  if (status === "APPROVED") {
    return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }

  return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Date(value).toLocaleString("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatMinutes(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";

  const sign = value > 0 ? "+" : "";
  return `${sign}${value} min`;
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const text = await response.text();

    if (!text) return fallback;

    try {
      const data = JSON.parse(text);

      if (typeof data?.message === "string") return data.message;

      if (Array.isArray(data?.message)) {
        return data.message.join(", ");
      }

      if (typeof data?.error === "string") return data.error;
    } catch {
      return text;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

function DeviationPanel({ entry }: { entry: TimeEntry }) {
  const deviation = entry.deviation;

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
        <span className="font-semibold">Afvigelsesanalyse</span>

        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            deviation.hasDeviation
              ? "bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-100"
              : "bg-green-200 text-green-900 dark:bg-green-900 dark:text-green-100"
          }`}
        >
          {deviation.hasDeviation ? "Afvigelse" : "OK"}
        </span>

        {deviation.requiresNote && (
          <span className="rounded-full bg-red-200 px-2 py-0.5 text-xs font-semibold text-red-900 dark:bg-red-900 dark:text-red-100">
            Kræver note
          </span>
        )}
      </div>

      <div className="grid gap-1">
        <div>
          <span className="font-semibold">Planlagt:</span> {plannedRange}
        </div>

        <div>
          <span className="font-semibold">Registreret:</span> {registeredRange}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        {deviation.messages.map((message, index) => (
          <div key={`${entry.id}-deviation-${index}`}>
            {deviation.hasDeviation ? "⚠️" : "✅"} {message}
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-1 text-xs opacity-80 sm:grid-cols-2">
        <div>Planlagt tid: {formatMinutes(deviation.plannedMinutes)}</div>
        <div>Registreret tid: {formatMinutes(deviation.registeredMinutes)}</div>
        <div>Difference: {formatMinutes(deviation.differenceMinutes)}</div>
        <div>
          Mødetidsafvigelse: {formatMinutes(deviation.clockInDeviationMinutes)}
        </div>
        <div>
          Fyraftensafvigelse:{" "}
          {formatMinutes(deviation.clockOutDeviationMinutes)}
        </div>
      </div>
    </div>
  );
}

export default function TimeApprovalPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const inputDialog = useInputModal();
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<AuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyEntry, setHistoryEntry] = useState<TimeEntry | null>(null);
  const [showApproved, setShowApproved] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [expandedEntryIds, setExpandedEntryIds] = useState<number[]>([]);

  const toggleEntryDetails = (entryId: number) => {
    setExpandedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId],
    );
  };

  const visibleEntries = entries.filter((entry) => {
    if (!entry.clockIn || !entry.clockOut) return false;
    if (entry.status === "APPROVED") return showApproved;
    if (entry.status === "REJECTED") return showRejected;
    return true;
  });

  const pendingCount = entries.filter(
    (entry) => entry.clockIn && entry.clockOut && entry.status === "PENDING",
  ).length;

  const approvedCount = entries.filter(
    (entry) => entry.clockIn && entry.clockOut && entry.status === "APPROVED",
  ).length;

  const rejectedCount = entries.filter(
    (entry) => entry.clockIn && entry.clockOut && entry.status === "REJECTED",
  ).length;

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
        `${API_URL}/audit-logs/entity/TimeEntry/${entry.id}`,
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

      setHistoryLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Kunne ikke hente historik",
      );
      setHistoryLogs([]);
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

  function reject(id: number) {
    inputDialog.prompt({
      title: "Afvis tidsregistrering",
      description: "Skriv evt. årsag til afvisning. Feltet må gerne være tomt.",
      label: "Årsag",
      placeholder:
        "Fx manglende registrering af fyraften, forkert tidspunkt...",
      confirmText: "Afvis",
      cancelText: "Annuller",
      required: false,
      onConfirm: async (value) => {
        const adminNote = value.trim();

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
              "Kunne ikke afvise timeregistrering",
            ),
          );
        }

        await fetchEntries();
        toast.success("Timeregistrering afvist");
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
                Gennemgå, godkend eller afvis mødetid og fyraften med tydelig
                sammenligning mellem vagtplan og registreret tid.
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
                      Viser som standard kun afventende registreringer.
                      <span className="ml-2 font-semibold">
                        Afventer: {pendingCount}
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
                          checked={showRejected}
                          onChange={(event) =>
                            setShowRejected(event.target.checked)
                          }
                          className="h-4 w-4"
                        />
                        Vis afviste ({rejectedCount})
                      </label>
                    </div>
                  </div>
                </div>

                {visibleEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-4">
                        <div>
                          <h2 className="text-xl font-bold">
                            {entry.user.firstName} {entry.user.lastName}
                          </h2>

                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {entry.user.email}
                          </p>
                        </div>

                        <div className="grid gap-2 text-sm">
                          <div>
                            <span className="font-semibold">Arbejdstype:</span>{" "}
                            {entry.shift?.workType?.name || "-"}
                          </div>

                          <div>
                            <span className="font-semibold">Mødt:</span>
                            {formatDateTime(entry.clockIn)}
                          </div>

                          <div>
                            <span className="font-semibold">Gået hjem:</span>
                            {formatDateTime(entry.clockOut)}
                          </div>

                          <div>
                            <span className="font-semibold">Timer:</span>{" "}
                            {getHours(entry)}
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => toggleEntryDetails(entry.id)}
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
                              <span className="font-semibold">Admin note:</span>{" "}
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
                            Afvigelse
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
                              onClick={() => reject(entry.id)}
                              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                            >
                              Afvis
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
          <AuditHistoryModal
            open={!!historyEntry}
            logs={historyLogs}
            loading={historyLoading}
            onClose={() => {
              setHistoryEntry(null);
              setHistoryLogs([]);
            }}
          />
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
