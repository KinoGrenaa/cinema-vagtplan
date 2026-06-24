import { formatDateTime } from "../helpers/myTimeDate";
import { getHours } from "../helpers/myTimeEntries";
import {
  getEntrySingleNote,
  shouldShowEntryNoteAsSingleNote,
} from "../helpers/myTimeNotes";
import { getStatusClass, getStatusLabel } from "../helpers/myTimeStatus";
import type { TimeEntry } from "../helpers/myTimeTypes";

type MyTimeEntryCardProps = {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
  onHistory: (entry: TimeEntry) => void;
};

export default function MyTimeEntryCard({
  entry,
  onEdit,
  onHistory,
}: MyTimeEntryCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-950/40">
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
          <span className="font-semibold">Timer:</span> {getHours(entry)}
        </div>

        <div>
          <span className="font-semibold">Status:</span>{" "}
          {getStatusLabel(entry.status)}
        </div>
      </div>

      {(entry.note || entry.clockInNote || entry.clockOutNote || entry.adminNote) && (
        <div className="mt-4 space-y-3">
          {shouldShowEntryNoteAsSingleNote(entry) ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
              <span className="font-semibold">Note:</span> {getEntrySingleNote(entry)}
            </div>
          ) : (
            <>
              {entry.clockInNote && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
                  <span className="font-semibold">Mødetidsnote:</span>{" "}
                  {entry.clockInNote}
                </div>
              )}

              {entry.clockOutNote && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-900 dark:bg-blue-950/40">
                  <span className="font-semibold">Fyraftensnote:</span>{" "}
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
          Denne tidsregistrering er sendt retur til rettelse og skal opdateres før
          den kan godkendes.
        </div>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <button
          onClick={() => onHistory(entry)}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Historik
        </button>

        {entry.status !== "APPROVED" && entry.status !== "VOIDED" && (
          <button
            onClick={() => onEdit(entry)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Redigér
          </button>
        )}
      </div>
    </div>
  );
}
