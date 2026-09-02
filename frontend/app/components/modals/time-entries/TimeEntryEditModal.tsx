"use client";

import { useEffect, useState } from "react";
import ProjectDateTimePicker from "@/app/components/date/ProjectDateTimePicker";
import type { TimeEntryMinuteStep } from "@/app/hooks/useTimeEntryMinuteStep";

import BaseModal from "../BaseModal";

type Props = {
  open: boolean;
  minuteStep: TimeEntryMinuteStep;
  clockIn: string;
  clockOut?: string | null;
  jobFunctionName?: string | null;
  plannedStartTime?: string | null;
  plannedEndTime?: string | null;
  deviationMessages?: string[];
  loading?: boolean;
  onClose: () => void;
  onSave: (data: {
    clockIn: string;
    clockOut?: string | null;
    adminNote: string;
  }) => Promise<void>;
};

function toInputDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();

  return new Date(date.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 16);
}

const summaryDateFormatter = new Intl.DateTimeFormat("da-DK", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Europe/Copenhagen",
});

const summaryTimeFormatter = new Intl.DateTimeFormat("da-DK", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Copenhagen",
});

function formatSummaryDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return `${summaryDateFormatter.format(date)} kl. ${summaryTimeFormatter
    .format(date)
    .replace(".", ":")}`;
}

function formatSummaryRange(
  start?: string | null,
  end?: string | null,
) {
  if (!start) return "-";

  return `${formatSummaryDateTime(start)} – ${
    end ? formatSummaryDateTime(end) : "åben"
  }`;
}

export default function TimeEntryEditModal({
  open,
  minuteStep,
  clockIn,
  clockOut,
  jobFunctionName,
  plannedStartTime,
  plannedEndTime,
  deviationMessages = [],
  loading = false,
  onClose,
  onSave,
}: Props) {
  const [newClockIn, setNewClockIn] = useState("");
  const [newClockOut, setNewClockOut] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setNewClockIn(toInputDateTime(clockIn));
    setNewClockOut(toInputDateTime(clockOut));
    setAdminNote("");
    setError("");
  }, [open, clockIn, clockOut]);

  async function handleSave() {
    if (!adminNote.trim()) {
      setError("Note om rettelsen er påkrævet");
      return;
    }

    await onSave({
      clockIn: new Date(newClockIn).toISOString(),
      clockOut: newClockOut ? new Date(newClockOut).toISOString() : null,
      adminNote: adminNote.trim(),
    });
  }

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Redigér timeregistrering"
      width="md"
    >
      <div className="space-y-4">
        {(jobFunctionName || plannedStartTime || plannedEndTime) && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            {jobFunctionName && (
              <div className="mb-3 text-sm font-bold text-gray-950 dark:text-white">
                {jobFunctionName}
              </div>
            )}

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Planlagt
                </div>
                <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {plannedStartTime && plannedEndTime
                    ? formatSummaryRange(plannedStartTime, plannedEndTime)
                    : "Ingen planlagt vagt"}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Registreret før rettelse
                </div>
                <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                  {formatSummaryRange(clockIn, clockOut)}
                </div>
              </div>
            </div>

            {deviationMessages.length > 0 && (
              <div className="mt-3 border-t border-gray-200 pt-3 text-sm text-orange-800 dark:border-gray-800 dark:text-orange-200">
                {deviationMessages.map((message, index) => (
                  <div key={`edit-deviation-${index}`}>{message}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium">Mødetid</label>
          <ProjectDateTimePicker
            minuteStep={minuteStep}
            value={newClockIn}
            onChange={setNewClockIn}
            clearable
            ariaLabel="Vælg mødetid dato og tid"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Fyraften</label>
          <ProjectDateTimePicker
            minuteStep={minuteStep}
            value={newClockOut}
            onChange={setNewClockOut}
            clearable
            ariaLabel="Vælg fyraften dato og tid"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Note om rettelsen
          </label>
          <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
            Noten er påkrævet og gemmes i registreringens historik.
          </p>
          <textarea
            value={adminNote}
            onChange={(event) => setAdminNote(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-gray-700 dark:bg-gray-800 dark:focus:border-blue-400 dark:focus:ring-blue-400/25"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Annuller
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSave}
            className="rounded-xl bg-blue-700 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            {loading ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>
      </div>
    </BaseModal>
  );
}
