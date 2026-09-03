import PayrollAdjustmentNotice from "../../../../components/time-entries/PayrollAdjustmentNotice";
import AutomaticTimeRegistrationNotice from "../../../../components/time-entries/AutomaticTimeRegistrationNotice";
import { getHours } from "../../helpers/core/myTimeEntries";
import {
  getEntrySingleNote,
  shouldShowEntryNoteAsSingleNote,
} from "../../helpers/core/myTimeNotes";
import {
  getStatusClass,
  getStatusLabel,
} from "../../helpers/core/myTimeStatus";
import type { TimeEntry } from "../../helpers/core/myTimeTypes";

type MyTimeEntryCardProps = {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
  onHistory: (entry: TimeEntry) => void;
};

function getStatusBadgeClass(status: TimeEntry["status"]) {
  if (status === "APPROVED") {
    return "border-green-300 bg-green-100 text-green-900 dark:border-green-800 dark:bg-green-950/70 dark:text-green-200";
  }

  if (status === "NEEDS_CHANGES") {
    return "border-orange-600 bg-orange-600 text-white dark:border-orange-500 dark:bg-orange-500 dark:text-gray-950";
  }

  if (status === "VOIDED") {
    return "border-red-300 bg-red-100 text-red-900 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200";
  }

  return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-200";
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isSameLocalDay(
  firstValue?: string | null,
  secondValue?: string | null,
) {
  if (!firstValue || !secondValue) {
    return true;
  }

  const first = new Date(firstValue);
  const second = new Date(secondValue);

  if (
    Number.isNaN(first.getTime()) ||
    Number.isNaN(second.getTime())
  ) {
    return true;
  }

  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function formatReturnMessageActor(entry: TimeEntry) {
  const actor =
    entry.revisions?.[0]?.changedByUser;

  if (!actor) {
    return "administrationen";
  }

  const fullName =
    `${actor.firstName || ""} ${actor.lastName || ""}`.trim();

  return fullName || actor.email || "administrationen";
}

function formatEntryTimeRange(entry: TimeEntry) {
  const start = formatTime(entry.clockIn);

  if (!entry.clockOut) {
    return `${start} → Ikke registreret · ${getHours(entry)}`;
  }

  const endDate =
    isSameLocalDay(entry.clockIn, entry.clockOut)
      ? ""
      : ` (${formatShortDate(entry.clockOut)})`;

  return `${start} → ${formatTime(entry.clockOut)}${endDate} · ${getHours(entry)}`;
}

export default function MyTimeEntryCard({
  entry,
  onEdit,
  onHistory,
}: MyTimeEntryCardProps) {
  const hasNotes = Boolean(
    entry.note ||
      entry.clockInNote ||
      entry.clockOutNote ||
      entry.adminNote,
  );
  const hasAutomaticTime =
    entry.automaticClockIn || entry.automaticClockOut;

  return (
    <article
      className={`rounded-xl border p-3 shadow-sm transition-colors ${getStatusClass(entry.status)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-base font-bold text-gray-950 dark:text-white">
          {entry.shift?.jobFunction?.name ||
            entry.payrollType?.name ||
            "Timeregistrering"}
        </h3>

        <span
          className={`w-fit shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(entry.status)}`}
        >
          {getStatusLabel(entry.status)}
        </span>
      </div>

      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {formatEntryTimeRange(entry)}
        </p>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onHistory(entry)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
          >
            Historik
          </button>

          {entry.status !== "APPROVED" &&
            entry.status !== "VOIDED" && (
              <button
                type="button"
                onClick={() => onEdit(entry)}
                className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
              >
                Redigér
              </button>
            )}
        </div>
      </div>

      {hasAutomaticTime && (
        <div className="mt-2">
          <AutomaticTimeRegistrationNotice
            automaticClockIn={entry.automaticClockIn}
            automaticClockOut={entry.automaticClockOut}
            inline
          />
        </div>
      )}

      <PayrollAdjustmentNotice
        adjustments={entry.payrollAdjustments}
        audience="employee"
      />

      {hasNotes && (
        <div className="mt-2 space-y-1.5 text-sm">
          {shouldShowEntryNoteAsSingleNote(entry) ? (
            <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                Note:
              </span>{" "}
              {getEntrySingleNote(entry)}
            </p>
          ) : (
            <>
              {entry.clockInNote && (
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Mødetidsnote:
                  </span>{" "}
                  {entry.clockInNote}
                </p>
              )}

              {entry.clockOutNote && (
                <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    Fyraftensnote:
                  </span>{" "}
                  {entry.clockOutNote}
                </p>
              )}
            </>
          )}

          {entry.adminNote &&
            (entry.status === "NEEDS_CHANGES" ||
              entry.adminNote.trim() !==
                entry.revisions?.[0]?.newAdminNote?.trim()) && (
            <div
              className={`rounded-lg border p-2.5 ${
                entry.status === "NEEDS_CHANGES"
                  ? "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/40"
                  : "border-blue-200 bg-blue-50 dark:border-blue-900/70 dark:bg-blue-950/30"
              }`}
            >
              <p
                className={`font-semibold ${
                  entry.status === "NEEDS_CHANGES"
                    ? "text-orange-900 dark:text-orange-200"
                    : "text-blue-900 dark:text-blue-200"
                }`}
              >
                {entry.status === "NEEDS_CHANGES"
                  ? `Besked fra ${formatReturnMessageActor(entry)}`
                  : "Note fra administrationen"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {entry.adminNote}
              </p>
            </div>
          )}
        </div>
      )}

      {entry.status === "NEEDS_CHANGES" && (
        <div className="mt-2 rounded-lg border border-orange-300 bg-orange-50 p-2.5 text-sm font-medium text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
          Denne tidsregistrering er sendt retur til rettelse og skal opdateres,
          før den kan godkendes.
        </div>
      )}

    </article>
  );
}
