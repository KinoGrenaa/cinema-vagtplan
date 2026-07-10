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

export default function MyTimeEntryCard({
  entry,
  onEdit,
  onHistory,
}: MyTimeEntryCardProps) {
  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${getStatusClass(
        entry.status,
      )}`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">
            {entry.shift?.workType?.name ||
              entry.payrollType?.name ||
              "Timeregistrering"}
          </h3>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {formatDateTime(entry.clockIn)}
          </p>
        </div>

        <span className="w-fit rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-950">
          {getStatusLabel(entry.status)}
        </span>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Mødetid
          </div>
          <div className="mt-1 font-medium">{formatDateTime(entry.clockIn)}</div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Fyraften
          </div>
          <div className="mt-1 font-medium">
            {entry.clockOut ? formatDateTime(entry.clockOut) : "Ikke registreret"}
          </div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Timer
          </div>
          <div className="mt-1 font-medium">{getHours(entry)}</div>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
            Status
          </div>
          <div className="mt-1 font-medium">{getStatusLabel(entry.status)}</div>
        </div>
      </div>

      {(entry.note || entry.clockInNote || entry.clockOutNote || entry.adminNote) && (
        <div className="mt-4 space-y-3 rounded-xl border border-gray-200 bg-white/70 p-3 text-sm dark:border-gray-800 dark:bg-gray-950/40">
          {shouldShowEntryNoteAsSingleNote(entry) ? (
            <div>
              <div className="font-semibold">Note</div>
              <div className="mt-1 whitespace-pre-wrap">
                {getEntrySingleNote(entry)}
              </div>
            </div>
          ) : (
            <>
              {entry.clockInNote && (
                <div>
                  <div className="font-semibold">Mødetidsnote</div>
                  <div className="mt-1 whitespace-pre-wrap">
                    {entry.clockInNote}
                  </div>
                </div>
              )}

              {entry.clockOutNote && (
                <div>
                  <div className="font-semibold">Fyraftensnote</div>
                  <div className="mt-1 whitespace-pre-wrap">
                    {entry.clockOutNote}
                  </div>
                </div>
              )}
            </>
          )}

          {entry.adminNote && (
            <div>
              <div className="font-semibold">
                {entry.status === "NEEDS_CHANGES"
                  ? "Besked fra administrationen"
                  : "Note fra administrationen"}
              </div>
              <div className="mt-1 whitespace-pre-wrap">{entry.adminNote}</div>
            </div>
          )}
        </div>
      )}

      {entry.status === "NEEDS_CHANGES" && (
        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800 dark:border-orange-900/70 dark:bg-orange-950/30 dark:text-orange-200">
          Denne tidsregistrering er sendt retur til rettelse og skal opdateres
          før den kan godkendes.
        </div>
      )}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => onHistory(entry)}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Historik
        </button>

        {entry.status !== "APPROVED" && entry.status !== "VOIDED" && (
          <button
            type="button"
            onClick={() => onEdit(entry)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Redigér
          </button>
        )}
      </div>
    </article>
  );
}
