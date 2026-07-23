import type { TimeEntry } from "../../types";
import {
  getStatusClass,
  getStatusLabel,
} from "../../utils";

type TimeApprovalEntryActionsProps = {
  entry: TimeEntry;
  onEdit: (entry: TimeEntry) => void;
  onOpenHistory: (
    entry: TimeEntry,
  ) => void;
  onApprove: (
    entry: TimeEntry,
  ) => void;
  onUnapprove: (
    entryId: number,
  ) => void;
  onSendBackForChanges: (
    entryId: number,
  ) => void;
  onVoid: (
    entryId: number,
  ) => void;
};

const actionBase =
  "rounded-xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900";

export default function TimeApprovalEntryActions({
  entry,
  onEdit,
  onOpenHistory,
  onApprove,
  onUnapprove,
  onSendBackForChanges,
  onVoid,
}: TimeApprovalEntryActionsProps) {
  return (
    <div className="flex flex-col items-start gap-3 lg:items-end">
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
          entry.status,
        )}`}
      >
        {getStatusLabel(entry.status)}
      </span>

      {entry.deviation
        ?.hasDeviation && (
        <span className="inline-flex rounded-full border border-orange-200 bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-900 dark:border-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
          {entry.shift
            ? "Afvigelse"
            : "Manuel registrering"}
        </span>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() =>
            onEdit(entry)
          }
          className={`${actionBase} bg-blue-700 text-white hover:bg-blue-800 focus-visible:ring-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:focus-visible:ring-blue-400`}
        >
          Redigér
        </button>

        <button
          type="button"
          onClick={() =>
            onOpenHistory(entry)
          }
          className={`${actionBase} bg-gray-700 text-white hover:bg-gray-800 focus-visible:ring-gray-600 dark:bg-gray-600 dark:hover:bg-gray-500 dark:focus-visible:ring-gray-400`}
        >
          Historik
        </button>

        {entry.status ===
          "PENDING" && (
          <button
            type="button"
            onClick={() =>
              onApprove(entry)
            }
            className={`${actionBase} bg-green-700 text-white hover:bg-green-800 focus-visible:ring-green-600 dark:bg-green-600 dark:hover:bg-green-500 dark:focus-visible:ring-green-400`}
          >
            Godkend
          </button>
        )}

        {entry.status ===
          "APPROVED" && (
          <button
            type="button"
            onClick={() =>
              onUnapprove(entry.id)
            }
            className={`${actionBase} bg-amber-500 text-gray-950 hover:bg-amber-600 focus-visible:ring-amber-500 dark:bg-amber-400 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-300`}
          >
            Fjern godkendelse
          </button>
        )}

        {entry.status ===
          "PENDING" && (
          <button
            type="button"
            onClick={() =>
              onSendBackForChanges(
                entry.id,
              )
            }
            className={`${actionBase} bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-600 dark:bg-red-600 dark:hover:bg-red-500 dark:focus-visible:ring-red-400`}
          >
            Send retur
          </button>
        )}

        {entry.status !==
          "VOIDED" && (
          <button
            type="button"
            onClick={() =>
              onVoid(entry.id)
            }
            className={`${actionBase} bg-red-900 text-white hover:bg-red-950 focus-visible:ring-red-700 dark:bg-red-800 dark:hover:bg-red-700 dark:focus-visible:ring-red-500`}
          >
            Afvis registrering
          </button>
        )}
      </div>
    </div>
  );
}
