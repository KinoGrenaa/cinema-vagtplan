import PayrollAdjustmentNotice from "../../../../components/time-entries/PayrollAdjustmentNotice";
import { formatDateTime } from "../../helpers/core/myTimeDate";
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
    return "border-orange-300 bg-orange-100 text-orange-900 dark:border-orange-800 dark:bg-orange-950/70 dark:text-orange-200";
  }

  if (status === "VOIDED") {
    return "border-red-300 bg-red-100 text-red-900 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200";
  }

  return "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/70 dark:text-amber-200";
}

export default function MyTimeEntryCard({
  entry,
  onEdit,
  onHistory,
}: MyTimeEntryCardProps) {
  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm transition-colors ${getStatusClass(entry.status)}`}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-950 dark:text-white">
            {entry.shift?.jobFunction?.name ||
              entry.payrollType?.name ||
              "Timeregistrering"}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {formatDateTime(entry.clockIn)}
          </p>
        </div>
        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(entry.status)}`}
        >
          {getStatusLabel(entry.status)}
        </span>
      </div>

      <PayrollAdjustmentNotice
        adjustments={entry.payrollAdjustments}
        audience="employee"
      />

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-gray-800 dark:bg-gray-950/50">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Mødetid
          </dt>
          <dd className="mt-1 font-medium text-gray-950 dark:text-white">
            {formatDateTime(entry.clockIn)}
          </dd>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-gray-800 dark:bg-gray-950/50">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Fyraften
          </dt>
          <dd className="mt-1 font-medium text-gray-950 dark:text-white">
            {entry.clockOut
              ? formatDateTime(entry.clockOut)
              : "Ikke registreret"}
          </dd>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-gray-800 dark:bg-gray-950/50">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Timer
          </dt>
          <dd className="mt-1 font-medium text-gray-950 dark:text-white">
            {getHours(entry)}
          </dd>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white/80 p-3 dark:border-gray-800 dark:bg-gray-950/50">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Status
          </dt>
          <dd className="mt-1 font-medium text-gray-950 dark:text-white">
            {getStatusLabel(entry.status)}
          </dd>
        </div>
      </dl>

      {(entry.note ||
        entry.clockInNote ||
        entry.clockOutNote ||
        entry.adminNote) && (
        <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white/80 p-4 text-sm dark:border-gray-800 dark:bg-gray-950/50">
          {shouldShowEntryNoteAsSingleNote(entry) ? (
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                Note
              </p>
              <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                {getEntrySingleNote(entry)}
              </p>
            </div>
          ) : (
            <>
              {entry.clockInNote && (
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    Mødetidsnote
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {entry.clockInNote}
                  </p>
                </div>
              )}
              {entry.clockOutNote && (
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    Fyraftensnote
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                    {entry.clockOutNote}
                  </p>
                </div>
              )}
            </>
          )}

          {entry.adminNote && (
            <div
              className={`rounded-xl border p-3 ${
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
                  ? "Besked fra administrationen"
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
        <div className="mt-4 rounded-xl border border-orange-300 bg-orange-50 p-3 text-sm font-medium text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200">
          Denne tidsregistrering er sendt retur til rettelse og skal opdateres,
          før den kan godkendes.
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onHistory(entry)}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
        >
          Historik
        </button>
        {entry.status !== "APPROVED" && entry.status !== "VOIDED" && (
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            Redigér
          </button>
        )}
      </div>
    </article>
  );
}
